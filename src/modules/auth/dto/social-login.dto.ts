import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma';

export class SocialLoginDto {
  @ApiProperty()
  @IsString()
  idToken: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.employee })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
