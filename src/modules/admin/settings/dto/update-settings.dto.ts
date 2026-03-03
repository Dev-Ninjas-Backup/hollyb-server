import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateGeneralSettingsDto {
  @ApiProperty({
    example: 'Hollyb',
    description: 'Workspace name',
    required: false,
  })
  @IsOptional()
  @IsString()
  workspaceName?: string;

  @ApiProperty({
    example: 'UTC',
    description: 'Timezone (e.g., America/New_York, Asia/Dubai, Europe/Berlin)',
    required: false,
  })
  @IsOptional()
  @IsString()
  Timezone?: string;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({
    example: false,
    description: 'Enable or disable two-factor authentication',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  two_factor_authentication_enabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable or disable system alerts',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  system_alerts_enabled?: boolean;

  @ApiProperty({
    example: false,
    description: 'Enable or disable email notifications',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  email_notifications_enabled?: boolean;
}
