import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendPasswordDto } from './dto/resend-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetOtpDto } from './dto/reset-otp.dto';
import { LogoutDto } from './dto/logout.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@Post('verify-otp')
	verifyOtp(@Body() dto: VerifyOtpDto) {
		return this.authService.verifyOtp(dto);
	}

	@Post('login')
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	@Post('forgot-password')
	forgotPassword(@Body() dto: ForgotPasswordDto) {
		return this.authService.forgotPassword(dto);
	}

	@Post('resend-pssword')
	resendPassword(@Body() dto: ResendPasswordDto) {
		return this.authService.resendPassword(dto);
	}

	@Post('change-password')
	changePassword(@Body() dto: ChangePasswordDto) {
		return this.authService.changePassword(dto);
	}

	@Post('reset-otp')
	resetOtp(@Body() dto: ResetOtpDto) {
		return this.authService.resetOtp(dto);
	}

	@Post('logout')
	logout(@Body() dto: LogoutDto) {
		return this.authService.logout(dto);
	}
}
