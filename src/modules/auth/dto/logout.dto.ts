import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    required: false,
    description: 'Optional reason for audit logs',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
