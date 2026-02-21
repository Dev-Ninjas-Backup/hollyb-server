import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma';

export class SocialLoginDto {
  @ApiProperty({ default: 'google_id_token_here' })
  @IsString()
  idToken: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.employee })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
