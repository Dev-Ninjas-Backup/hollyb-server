import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, AuthProvider, OtpType, User, UserRole } from '@prisma';
import { compare, hash } from 'bcryptjs';
import nodemailer from 'nodemailer';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
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
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetOtpDto } from './dto/reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SocialLoginDto } from './dto/social-login.dto';

type TokenPayload = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
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
          token: tokens.accessToken,
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
        token: resetVerificationToken,
      },
      'OTP verified successfully',
    );
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email);

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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    await this.createOtp(user.id, OtpType.password_reset);
    return ResponseHelper.success(
      null,
      'OTP sent successfully. Please verify the OTP to reset your password',
    );
  }

  async resendOtp(dto: ResetOtpDto) {
    const user = await this.findUserByEmail(dto.email);
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    if (!user.password_hash) {
      throw new BusinessException(
        'Password is not set for this account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isOldPasswordValid = await compare(
      dto.oldPassword,
      user.password_hash,
    );
    if (!isOldPasswordValid) {
      throw new BusinessException(
        'Old password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newPasswordHash = await hash(dto.newPassword, 10);

    await this.prismaService.client.$transaction([
      this.prismaService.client.user.update({
        where: { id: userId },
        data: {
          password_hash: newPasswordHash,
          last_active_at: new Date(),
        },
      }),
      this.prismaService.client.userAuthProvider.updateMany({
        where: {
          user_id: userId,
          provider: AuthProvider.credentials,
        },
        data: {
          access_token: null,
          refresh_token: null,
        },
      }),
    ]);

    return ResponseHelper.success(null, 'Password changed successfully');
  }

  async logout(userId: string, token: string) {
    const providers = await this.prismaService.client.userAuthProvider.findMany({
      where: {
        user_id: userId,
        access_token: { not: null },
      },
      select: {
        id: true,
        access_token: true,
      },
    });

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
      throw new BusinessException(
        'User email is not available for OTP sending',
      );
    }

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
