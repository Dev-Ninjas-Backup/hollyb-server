import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  email: string;
}
