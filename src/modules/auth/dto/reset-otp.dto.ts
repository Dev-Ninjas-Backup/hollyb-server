import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResetOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
