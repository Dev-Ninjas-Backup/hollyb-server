import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetOtpDto } from './dto/reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { AuthSocialService } from './auth-social.service';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSocialService: AuthSocialService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Register a new user account with email and password. An OTP will be sent to the email for verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. OTP sent to email.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email already exists.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verify the OTP code sent to user email during registration.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully. Account activated.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('admin-verify-otp')
  @ApiOperation({
    summary: 'Verify admin 2FA OTP',
    description:
      'Verify the OTP code sent to admin email during two-factor authentication login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin OTP verified successfully. Login completed.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only for admin users.' })
  adminVerifyOtp(@Body() dto: AdminVerifyOtpDto) {
    return this.authService.adminVerifyOtp(dto);
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend OTP',
    description:
      'Resend OTP code to user email if the previous one expired or was not received.',
  })
  @ApiResponse({ status: 200, description: 'OTP resent successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Email not found or account already verified.',
  })
  resendOtp(@Body() dto: ResetOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticate user with email and password. Returns JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token and user data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account not verified.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @ApiOperation({
    summary: 'Google login',
    description:
      'Authenticate user with Google ID token. Creates new account if user does not exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token.' })
  googleLogin(@Body() dto: SocialLoginDto) {
    return this.authSocialService.googleLogin(dto);
  }

  @Post('facebook')
  @ApiOperation({
    summary: 'Facebook login',
    description:
      'Authenticate user with Facebook ID token. Creates new account if user does not exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid Facebook token.' })
  facebookLogin(@Body() dto: SocialLoginDto) {
    return this.authSocialService.facebookLogin(dto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Send password reset OTP to user email. User must verify OTP before resetting password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP sent to email.',
  })
  @ApiResponse({ status: 404, description: 'Email not found.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Reset password using email verification. User must have verified OTP from forgot-password endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or passwords do not match.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout authenticated user and invalidate the current access token.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.sub, req.authToken);
  }
}
