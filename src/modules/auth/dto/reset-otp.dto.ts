import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResetOtpDto {
  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  email: string;
}
