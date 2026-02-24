import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class AdminVerifyOtpDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Admin email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code sent to email',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}
