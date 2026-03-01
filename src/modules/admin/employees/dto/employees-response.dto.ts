import { ApiProperty } from '@nestjs/swagger';

export class AdminEmployeeStatsDto {
  @ApiProperty({ example: 2560 })
  totalEmployees: number;

  @ApiProperty({ example: 1920 })
  verifiedEmployees: number;

  @ApiProperty({ example: 870 })
  activeJobs: number;

  @ApiProperty({ example: 200 })
  topRatedEmployees: number;

  @ApiProperty({ example: 4.8 })
  topRatedThreshold: number;
}

export class AdminEmployeeGrowthItemDto {
  @ApiProperty({ example: 'Jan' })
  month: string;

  @ApiProperty({ example: 120 })
  count: number;
}

export class AdminEmployeeGrowthResponseDto {
  @ApiProperty({ example: 'last_6_months' })
  period: string;

  @ApiProperty({ type: [AdminEmployeeGrowthItemDto] })
  items: AdminEmployeeGrowthItemDto[];
}

export class AdminEmployeeEngagementItemDto {
  @ApiProperty({ example: 'Mon' })
  day: string;

  @ApiProperty({ example: '2026-03-02' })
  date: string;

  @ApiProperty({ example: 78 })
  active: number;

  @ApiProperty({ example: 42 })
  inactive: number;
}

export class AdminEmployeeEngagementResponseDto {
  @ApiProperty({ example: 'last_7_days' })
  period: string;

  @ApiProperty({ type: [AdminEmployeeEngagementItemDto] })
  items: AdminEmployeeEngagementItemDto[];
}

export class AdminEmployeeRecentActivityItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'John Smith' })
  name: string;

  @ApiProperty({
    example: 'https://cdn.example.com/avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Completed job "Waiter Shift"' })
  action: string;

  @ApiProperty({ example: '2 hr ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-03-02T06:00:00.000Z' })
  occurredAt: Date;
}
