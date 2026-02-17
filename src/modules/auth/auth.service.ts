import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, AuthProvider, OtpType, User, UserRole } from '@prisma';
import { compare, hash } from 'bcryptjs';
import nodemailer from 'nodemailer';
import { PrismaService } from '@/prisma/prisma.service';
import { getMailConfig } from '@/config/mail.config';
import {
	BusinessException,
	DuplicateResourceException,
	ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { ResponseHelper } from '@/common/utils/response.helper';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendPasswordDto } from './dto/resend-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetOtpDto } from './dto/reset-otp.dto';
import { LogoutDto } from './dto/logout.dto';

type TokenPayload = {
	sub: string;
	role: UserRole;
};

@Injectable()
export class AuthService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async register(dto: RegisterDto) {
		this.ensureEmail(dto.email);

		const existingUser = await this.prismaService.client.user.findFirst({
			where: {
				email: dto.email,
			},
		});

		if (existingUser?.email && dto.email === existingUser.email) {
			throw new DuplicateResourceException('User', 'email');
		}

		const passwordHash = await hash(dto.password, 10);
		const user = await this.prismaService.client.user.create({
			data: {
				full_name: dto.fullName,
				email: dto.email,
				role: dto.role,
				password_hash: passwordHash,
				account_status: AccountStatus.pending,
			},
		});

		await this.prismaService.client.userAuthProvider.create({
			data: {
				user_id: user.id,
				provider: AuthProvider.credentials,
				provider_user_id: user.id,
			},
		});

		await this.createOtp(user.id, OtpType.email);

		return ResponseHelper.created(
			{
				userId: user.id,
				email: user.email,
				role: user.role,
			},
			'Registration successful. OTP sent for verification',
		);
	}

	async verifyOtp(dto: VerifyOtpDto) {
		const user = await this.findUserByEmail(dto.email);
		const otp = await this.findValidOtp(user.id, dto.code, OtpType.email);

		await this.prismaService.client.$transaction([
			this.prismaService.client.otpVerification.update({
				where: { id: otp.id },
				data: { is_used: true },
			}),
			this.prismaService.client.user.update({
				where: { id: user.id },
				data: {
					is_verified: true,
					account_status: AccountStatus.active,
					is_active: true,
				},
			}),
		]);

		await this.createRoleProfile(user.id, user.role);

		return ResponseHelper.success(null, 'OTP verified successfully');
	}

	async login(dto: LoginDto) {
		const user = await this.findUserByEmail(dto.email);

		if (!user.password_hash) {
			throw new BusinessException('Credentials login is not available for this user');
		}

		const isPasswordValid = await compare(dto.password, user.password_hash);
		if (!isPasswordValid) {
			throw new BusinessException('Invalid credentials', HttpStatus.UNAUTHORIZED);
		}

		if (!user.is_verified) {
			throw new BusinessException('User is not verified yet', HttpStatus.FORBIDDEN);
		}

		if (!user.is_active || user.account_status !== AccountStatus.active) {
			throw new BusinessException('Account is not active', HttpStatus.FORBIDDEN);
		}

		const tokens = await this.generateTokens(user);

		await this.prismaService.client.$transaction([
			this.prismaService.client.user.update({
				where: { id: user.id },
				data: {
					last_login_at: new Date(),
					last_active_at: new Date(),
				},
			}),
			this.prismaService.client.userAuthProvider.updateMany({
				where: {
					user_id: user.id,
					provider: AuthProvider.credentials,
				},
				data: {
					refresh_token: tokens.refreshToken,
				},
			}),
		]);

		return ResponseHelper.success(
			{
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				user: {
					id: user.id,
					fullName: user.full_name,
					email: user.email,
					role: user.role,
				},
			},
			'Login successful',
		);
	}

	async forgotPassword(dto: ForgotPasswordDto) {
		const user = await this.findUserByEmail(dto.email);
		await this.createOtp(user.id, OtpType.password_reset);
		return ResponseHelper.success(null, 'Password reset OTP sent successfully');
	}

	async resendPassword(dto: ResendPasswordDto) {
		const user = await this.findUserByEmail(dto.email);
		await this.createOtp(user.id, OtpType.password_reset);
		return ResponseHelper.success(null, 'Password reset OTP resent successfully');
	}

	async resetOtp(dto: ResetOtpDto) {
		const user = await this.findUserByEmail(dto.email);
		await this.createOtp(user.id, OtpType.password_reset);

		return ResponseHelper.success(null, 'Reset OTP sent successfully');
	}

	async changePassword(dto: ChangePasswordDto) {
		const payload = await this.verifyResetToken(dto.resetToken);
		const passwordHash = await hash(dto.newPassword, 10);

		await this.prismaService.client.user.update({
			where: { id: payload.sub },
			data: {
				password_hash: passwordHash,
				last_active_at: new Date(),
			},
		});

		await this.prismaService.client.userAuthProvider.updateMany({
			where: {
				user_id: payload.sub,
				provider: AuthProvider.credentials,
			},
			data: {
				refresh_token: null,
			},
		});

		return ResponseHelper.success(null, 'Password changed successfully');
	}

	async logout(dto: LogoutDto) {
		if (!dto.refreshToken) {
			return ResponseHelper.success(null, 'Logout successful');
		}

		try {
			const payload = await this.jwtService.verifyAsync<{ sub: string }>(
				dto.refreshToken,
				{
					secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
				},
			);

			await this.prismaService.client.userAuthProvider.updateMany({
				where: {
					user_id: payload.sub,
					provider: AuthProvider.credentials,
					refresh_token: dto.refreshToken,
				},
				data: {
					refresh_token: null,
				},
			});
		} catch {
			return ResponseHelper.success(null, 'Logout successful');
		}

		return ResponseHelper.success(null, 'Logout successful');
	}

	private ensureEmail(email?: string) {
		if (!email) {
			throw new BusinessException('Email is required');
		}
	}

	private async findUserByEmail(email: string) {
		this.ensureEmail(email);

		const user = await this.prismaService.client.user.findFirst({
			where: {
				email,
			},
		});

		if (!user) {
			throw new ResourceNotFoundException('User', email);
		}

		return user;
	}

	private async createOtp(userId: string, type: OtpType) {
		const user = await this.prismaService.client.user.findUnique({
			where: { id: userId },
			select: { email: true },
		});

		if (!user?.email) {
			throw new BusinessException('User email is not available for OTP sending');
		}

		const otpExpiryMinutes =
			this.configService.getOrThrow<number>('OTP_EXPIRES_MINUTES');
		const code = this.generateOtpCode();

		await this.prismaService.client.otpVerification.create({
			data: {
				user_id: userId,
				code,
				type,
				expires_at: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
			},
		});

		await this.sendOtpEmail(user.email, code, type);

		return code;
	}

	private async sendOtpEmail(email: string, code: string, type: OtpType) {
		const mailConfig = getMailConfig();

		if (!mailConfig.auth.user || !mailConfig.auth.pass || !mailConfig.from) {
			throw new BusinessException(
				'SMTP configuration is missing',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}

		const transporter = nodemailer.createTransport({
			host: mailConfig.host,
			port: mailConfig.port,
			secure: mailConfig.secure,
			auth: mailConfig.auth,
		});

		const purpose =
			type === OtpType.password_reset
				? 'Password Reset OTP'
				: 'Account Verification OTP';

		await transporter.sendMail({
			from: mailConfig.from,
			to: email,
			subject: `Hollyb ${purpose}`,
			text: `Your OTP is ${code}. It will expire in ${this.configService.getOrThrow<number>('OTP_EXPIRES_MINUTES')} minutes.`,
			html: `<p>Your OTP is <b>${code}</b>.</p><p>It will expire in ${this.configService.getOrThrow<number>('OTP_EXPIRES_MINUTES')} minutes.</p>`,
		});
	}

	private async findValidOtp(userId: string, code: string, type: OtpType) {
		const otp = await this.prismaService.client.otpVerification.findFirst({
			where: {
				user_id: userId,
				code,
				type,
				is_used: false,
			},
			orderBy: {
				created_at: 'desc',
			},
		});

		if (!otp) {
			throw new BusinessException('Invalid OTP', HttpStatus.BAD_REQUEST);
		}

		if (otp.expires_at.getTime() < Date.now()) {
			throw new BusinessException('OTP has expired', HttpStatus.BAD_REQUEST);
		}

		return otp;
	}

	private generateOtpCode() {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	private async generateTokens(user: User) {
		const payload: TokenPayload = {
			sub: user.id,
			role: user.role,
		};

		const accessToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
			expiresIn: this.configService.getOrThrow<string>(
				'JWT_ACCESS_EXPIRES_IN',
			) as never,
		});

		const refreshToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
			expiresIn: this.configService.getOrThrow<string>(
				'JWT_REFRESH_EXPIRES_IN',
			) as never,
		});

		return { accessToken, refreshToken };
	}

	private async verifyResetToken(token: string) {
		try {
			const payload = await this.jwtService.verifyAsync<{
				sub: string;
				purpose: string;
			}>(token, {
				secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
			});

			if (payload.purpose !== 'password_reset') {
				throw new BusinessException(
					'Invalid reset token',
					HttpStatus.UNAUTHORIZED,
				);
			}

			return payload;
		} catch {
			throw new BusinessException(
				'Invalid or expired reset token',
				HttpStatus.UNAUTHORIZED,
			);
		}
	}

	private async createRoleProfile(userId: string, role: UserRole) {
		if (role === UserRole.employee) {
			await this.prismaService.client.employeeProfile.upsert({
				where: { user_id: userId },
				update: {},
				create: { user_id: userId },
			});
			return;
		}

		if (role === UserRole.employer) {
			await this.prismaService.client.employerProfile.upsert({
				where: { user_id: userId },
				update: {},
				create: { user_id: userId },
			});
		}
	}
}
