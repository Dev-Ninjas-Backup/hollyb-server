import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
