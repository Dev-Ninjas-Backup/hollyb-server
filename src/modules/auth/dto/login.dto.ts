import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ default: 'rafisharkar144@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, default: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
