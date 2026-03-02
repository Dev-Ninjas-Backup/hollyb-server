import { ApiProperty } from '@nestjs/swagger';

export class OverviewSystemHealthCardDto {
  @ApiProperty({ example: 'Auto Check Status' })
  title: string;

  @ApiProperty({ example: 'Running Smoothly' })
  value: string;

  @ApiProperty({ example: 'Healthy' })
  badge: string;

  @ApiProperty({ enum: ['healthy', 'normal', 'attention', 'critical'] })
  level: 'healthy' | 'normal' | 'attention' | 'critical';
}

export class OverviewSystemHealthResponseDto {
  @ApiProperty({ type: OverviewSystemHealthCardDto })
  autoCheckStatus: OverviewSystemHealthCardDto;

  @ApiProperty({ type: OverviewSystemHealthCardDto })
  serverLoad: OverviewSystemHealthCardDto;

  @ApiProperty({ type: OverviewSystemHealthCardDto })
  lastSystemSync: OverviewSystemHealthCardDto;

  @ApiProperty({ example: '2026-03-03T11:20:00.000Z' })
  generatedAt: Date;
}
