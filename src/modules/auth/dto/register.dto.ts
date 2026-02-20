import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma';

export class RegisterDto {
  @ApiProperty({ default: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ default: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole, default: UserRole.employee })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ minLength: 6, default: '123456' })
  @IsString()
  @MinLength(6)
  password: string;
}
