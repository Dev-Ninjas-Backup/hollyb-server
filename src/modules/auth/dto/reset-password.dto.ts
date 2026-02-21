import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, default: '123456' })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ minLength: 6, default: '123456' })
  @IsString()
  @MinLength(6)
  confirmNewPassword: string;
}
