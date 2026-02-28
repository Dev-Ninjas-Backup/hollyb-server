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
import { ResetOtpDto } from './dto/reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationService } from '../notification/notification.service';

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
    private readonly notificationService: NotificationService,
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

    // Notify admins (super_admin) about new user registration
    await this.notificationService.notifyAdminsOfNewUser({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });

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
    const otp = await this.findValidOtpByCode(user.id, dto.code);

    await this.prismaService.client.otpVerification.update({
      where: { id: otp.id },
      data: { is_used: true },
    });

    if (otp.type === OtpType.email) {
      await this.prismaService.client.user.update({
        where: { id: user.id },
        data: {
          is_verified: true,
          account_status: AccountStatus.active,
          is_active: true,
        },
      });

      await this.createRoleProfile(user.id, user.role);

      const tokens = await this.generateTokens(user);
      await this.storeAccessTokenHash(user.id, tokens.accessToken);

      return ResponseHelper.success(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        'OTP verified successfully',
      );
    }

    const resetVerificationToken = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'reset_verified' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m' as never,
      },
    );

    return ResponseHelper.success(
      {
        accessToken: resetVerificationToken,
      },
      'OTP verified successfully',
    );
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email);
    this.ensureUserCanAuthenticate(user);

    if (!user.password_hash) {
      throw new BusinessException(
        'Credentials login is not available for this user',
      );
    }

    const isPasswordValid = await compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new BusinessException(
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.is_verified) {
      await this.createOtp(user.id, OtpType.email);
      return ResponseHelper.success(
        null,
        'Your account is not verified. A verification OTP has been sent to your email',
      );
    }

    if (!user.is_active || user.account_status !== AccountStatus.active) {
      throw new BusinessException(
        'Account is not active',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is admin and 2FA is enabled
    if (user.role === UserRole.admin) {
      const settings = await this.prismaService.client.setting.findUnique({
        where: { updated_by: user.id },
      });
      console.log(settings);

      console.log(
        `🔒 Admin login detected. 2FA enabled: ${settings?.two_factor_authentication_enabled}`,
      );

      if (settings?.two_factor_authentication_enabled) {
        // Generate and send OTP for admin 2FA
        console.log(`📧 Generating 2FA OTP for admin: ${user.email}`);
        await this.createOtp(user.id, OtpType.email);
        return ResponseHelper.success(
          { requiresTwoFactor: true },
          'Two-factor authentication required. OTP has been sent to your email',
        );
      }
    }

    const tokens = await this.generateTokens(user);
    await this.storeAccessTokenHash(user.id, tokens.accessToken);

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
          refresh_token: null,
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

  async adminVerifyOtp(dto: VerifyOtpDto) {
    const user = await this.findUserByEmail(dto.email);
    this.ensureUserCanAuthenticate(user);

    // Verify user is admin
    if (user.role !== UserRole.admin) {
      throw new BusinessException(
        'This endpoint is only for admin users',
        HttpStatus.FORBIDDEN,
      );
    }

    // Verify OTP
    const otp = await this.findValidOtpByCode(user.id, dto.code);

    await this.prismaService.client.otpVerification.update({
      where: { id: otp.id },
      data: { is_used: true },
    });

    // Generate tokens and complete login
    const tokens = await this.generateTokens(user);
    await this.storeAccessTokenHash(user.id, tokens.accessToken);

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
          refresh_token: null,
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
      'Admin login successful',
    );
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    this.ensureUserCanAuthenticate(user);
    await this.createOtp(user.id, OtpType.password_reset);
    return ResponseHelper.success(
      null,
      'OTP sent successfully. Please verify the OTP to reset your password',
    );
  }

  async resendOtp(dto: ResetOtpDto) {
    const user = await this.findUserByEmail(dto.email);
    this.ensureUserCanAuthenticate(user);
    await this.createOtp(user.id, OtpType.password_reset);

    return ResponseHelper.success(
      null,
      'OTP resent successfully. Please check your email inbox',
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BusinessException(
        'New password and confirm new password do not match',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.findUserByEmail(dto.email);
    this.ensureUserCanAuthenticate(user);
    const latestUsedPasswordResetOtp =
      await this.prismaService.client.otpVerification.findFirst({
        where: {
          user_id: user.id,
          type: OtpType.password_reset,
          is_used: true,
          expires_at: {
            gt: new Date(),
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    if (!latestUsedPasswordResetOtp) {
      throw new BusinessException(
        'Password reset OTP verification is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await hash(dto.newPassword, 10);

    await this.prismaService.client.$transaction([
      this.prismaService.client.user.update({
        where: { id: user.id },
        data: {
          password_hash: passwordHash,
          last_active_at: new Date(),
        },
      }),
      this.prismaService.client.otpVerification.deleteMany({
        where: {
          user_id: user.id,
          type: OtpType.password_reset,
        },
      }),
      this.prismaService.client.userAuthProvider.updateMany({
        where: {
          user_id: user.id,
          provider: AuthProvider.credentials,
        },
        data: {
          access_token: null,
          refresh_token: null,
        },
      }),
    ]);

    return ResponseHelper.success(null, 'Password updated successfully');
  }

  async logout(userId: string, token: string) {
    const providers = await this.prismaService.client.userAuthProvider.findMany(
      {
        where: {
          user_id: userId,
          access_token: { not: null },
        },
        select: {
          id: true,
          access_token: true,
        },
      },
    );

    let matchedProviderId: string | null = null;

    for (const provider of providers) {
      if (!provider.access_token) {
        continue;
      }
      const matched = await compare(token, provider.access_token);
      if (matched) {
        matchedProviderId = provider.id;
        break;
      }
    }

    if (!matchedProviderId) {
      throw new BusinessException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    await this.prismaService.client.userAuthProvider.update({
      where: { id: matchedProviderId },
      data: {
        access_token: null,
        refresh_token: null,
      },
    });

    return ResponseHelper.success(null, 'Logout successful');
  }

  private ensureEmail(email?: string) {
    if (!email) {
      throw new BusinessException('Email is required');
    }
  }

  private ensureUserCanAuthenticate(user: User) {
    if (user.is_deleted) {
      throw new BusinessException(
        'Your account has been deleted. Please contact support for help.',
        HttpStatus.FORBIDDEN,
      );
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
      select: { email: true, full_name: true },
    });

    if (!user?.email) {
      throw new BusinessException(
        'User email is not available for OTP sending',
      );
    }

    console.log(
      `🔐 Creating OTP for user: ${user.full_name} (${user.email}), type: ${type}`,
    );

    const otpExpiryMinutes = this.configService.getOrThrow<number>(
      'OTP_EXPIRES_MINUTES',
    );
    const code = this.generateOtpCode();

    await this.prismaService.client.otpVerification.create({
      data: {
        user_id: userId,
        code,
        type,
        expires_at: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
      },
    });

    console.log(`✅ OTP created: ${code}`);

    await this.sendOtpEmail(user.email, code, type);

    return code;
  }

  private async storeAccessTokenHash(userId: string, accessToken: string) {
    await this.storeAccessTokenHashByProvider(
      userId,
      AuthProvider.credentials,
      accessToken,
    );
  }

  private async storeAccessTokenHashByProvider(
    userId: string,
    provider: AuthProvider,
    accessToken: string,
  ) {
    const hashedAccessToken = await hash(accessToken, 10);

    const existingProvider =
      await this.prismaService.client.userAuthProvider.findFirst({
        where: {
          user_id: userId,
          provider,
        },
        select: {
          id: true,
        },
      });

    if (existingProvider) {
      await this.prismaService.client.userAuthProvider.update({
        where: {
          id: existingProvider.id,
        },
        data: {
          access_token: hashedAccessToken,
        },
      });
      return;
    }

    await this.prismaService.client.userAuthProvider.create({
      data: {
        user_id: userId,
        provider,
        provider_user_id: userId,
        access_token: hashedAccessToken,
      },
    });
  }

  private async findValidOtpByCode(userId: string, code: string) {
    const otp = await this.prismaService.client.otpVerification.findFirst({
      where: {
        user_id: userId,
        code,
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

  private async sendOtpEmail(email: string, code: string, type: OtpType) {
    const mailConfig = getMailConfig();

    if (!mailConfig.auth.user || !mailConfig.auth.pass || !mailConfig.from) {
      console.error('❌ SMTP configuration is missing');
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

    let purpose: string;
    let message: string;

    if (type === OtpType.password_reset) {
      purpose = 'Password Reset OTP';
      message =
        'You requested to reset your password. Use the OTP below to proceed.';
    } else {
      purpose = 'Account Verification OTP';
      message = 'Please verify your account using the OTP below.';
    }

    try {
      console.log(`📧 Sending OTP email to: ${email}`);
      await transporter.sendMail({
        from: mailConfig.from,
        to: email,
        subject: `Hollyb ${purpose}`,
        text: `${message}\n\nYour OTP is ${code}. It will expire in ${this.configService.getOrThrow<number>('OTP_EXPIRES_MINUTES')} minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hollyb ${purpose}</h2>
            <p>${message}</p>
            <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
              <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${code}</p>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in ${this.configService.getOrThrow<number>('OTP_EXPIRES_MINUTES')} minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`✅ OTP email sent successfully to: ${email}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw new BusinessException(
        'Failed to send OTP email. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
