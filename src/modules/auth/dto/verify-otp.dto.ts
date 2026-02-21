import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ default: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
