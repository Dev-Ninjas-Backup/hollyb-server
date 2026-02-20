import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    required: false,
    default: 'User requested logout',
    description: 'Optional reason for audit logs',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
