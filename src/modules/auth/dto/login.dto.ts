import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ default: 'admin@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, default: '12345678' })
  @IsString()
  @MinLength(6)
  password: string;
}
