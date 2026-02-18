import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { compare, hash } from 'bcryptjs';
import { AccountStatus, AuthProvider, User, UserRole } from '@prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { ResponseHelper } from '@/common/utils/response.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { SocialLoginDto } from './dto/social-login.dto';

type TokenPayload = {
	sub: string;
	role: UserRole;
};

@Injectable()
export class AuthSocialService {
	private firebaseApp: App;

	constructor(
		private readonly prismaService: PrismaService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {
		this.firebaseApp = this.getFirebaseApp();
	}

	async googleLogin(dto: SocialLoginDto) {
		return this.socialLogin(dto, AuthProvider.google, 'google.com');
	}

	async facebookLogin(dto: SocialLoginDto) {
		return this.socialLogin(dto, AuthProvider.facebook, 'facebook.com');
	}

	private async socialLogin(
		dto: SocialLoginDto,
		provider: AuthProvider,
		expectedProvider: 'google.com' | 'facebook.com',
	) {
		const decodedToken = await this.verifyFirebaseToken(dto.idToken);
		const signInProvider = decodedToken.firebase?.sign_in_provider;

		if (signInProvider !== expectedProvider) {
			throw new BusinessException(
				`Invalid provider token. Expected ${expectedProvider}`,
				HttpStatus.BAD_REQUEST,
			);
		}

		if (!decodedToken.email) {
			throw new BusinessException(
				'Email is required from social provider',
				HttpStatus.BAD_REQUEST,
			);
		}

		let user = await this.prismaService.client.user.findFirst({
			where: { email: decodedToken.email },
		});

		if (user && dto.role && user.role !== dto.role) {
			throw new BusinessException(
				`Role mismatch: this account is already registered as ${user.role}`,
				HttpStatus.CONFLICT,
			);
		}

		if (!user) {
			user = await this.prismaService.client.user.create({
				data: {
					full_name: decodedToken.name ?? decodedToken.email,
					email: decodedToken.email,
					role: dto.role ?? UserRole.employee,
					account_status: AccountStatus.active,
					is_verified: true,
					is_active: true,
					password_hash: null,
				},
			});
			await this.createRoleProfile(user.id, user.role);
		}

		const existingProvider =
			await this.prismaService.client.userAuthProvider.findFirst({
				where: {
					provider,
					provider_user_id: decodedToken.uid,
				},
			});

		if (!existingProvider) {
			await this.prismaService.client.userAuthProvider.create({
				data: {
					user_id: user.id,
					provider,
					provider_user_id: decodedToken.uid,
				},
			});
		} else if (existingProvider.user_id !== user.id) {
			throw new BusinessException(
				'This social account is already linked with another user',
				HttpStatus.CONFLICT,
			);
		}

		const tokens = await this.generateTokens(user);
		await this.storeAccessTokenHashByProvider(user.id, provider, tokens.accessToken);

		await this.prismaService.client.user.update({
			where: { id: user.id },
			data: {
				last_login_at: new Date(),
				last_active_at: new Date(),
				is_verified: true,
				is_active: true,
				account_status: AccountStatus.active,
			},
		});

		return ResponseHelper.success(
			{
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				user: {
					id: user.id,
					fullName: user.full_name,
					email: user.email,
					role: user.role,
					provider,
				},
			},
			`${provider === AuthProvider.google ? 'Google' : 'Facebook'} login successful`,
		);
	}

	private async verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
		try {
			return await getAuth(this.firebaseApp).verifyIdToken(idToken, true);
		} catch {
			throw new BusinessException(
				'Invalid Firebase token',
				HttpStatus.UNAUTHORIZED,
			);
		}
	}

	private getFirebaseApp(): App {
		if (getApps().length > 0) {
			return getApp();
		}

		const projectId = this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
		const clientEmail =
			this.configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL');
		const privateKey = this.configService
			.getOrThrow<string>('FIREBASE_PRIVATE_KEY')
			.replace(/\\n/g, '\n');

		return initializeApp({
			credential: cert({
				projectId,
				clientEmail,
				privateKey,
			}),
		});
	}

	private async storeAccessTokenHashByProvider(
		userId: string,
		provider: AuthProvider,
		accessToken: string,
	) {
		const hashedAccessToken = await hash(accessToken, 10);

		await this.prismaService.client.userAuthProvider.updateMany({
			where: {
				user_id: userId,
				provider,
			},
			data: {
				access_token: hashedAccessToken,
			},
		});
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
