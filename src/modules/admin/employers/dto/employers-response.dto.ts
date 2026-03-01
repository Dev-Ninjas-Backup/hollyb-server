import { ApiProperty } from '@nestjs/swagger';

export class AdminEmployerStatsTrendDto {
  @ApiProperty({
    type: Object,
    example: {
      value: 18,
      isPositive: true,
      sign: 'up',
    },
  })
  totalEmployers: {
    value: number;
    isPositive: boolean;
    sign: 'up' | 'down' | 'flat';
  };

  @ApiProperty({
    type: Object,
    example: {
      value: 19,
      isPositive: true,
      sign: 'up',
    },
  })
  activeJobPosts: {
    value: number;
    isPositive: boolean;
    sign: 'up' | 'down' | 'flat';
  };

  @ApiProperty({
    type: Object,
    example: {
      value: 16,
      isPositive: true,
      sign: 'up',
    },
  })
  subscriptionActive: {
    value: number;
    isPositive: boolean;
    sign: 'up' | 'down' | 'flat';
  };

  @ApiProperty({
    type: Object,
    example: {
      value: 14,
      isPositive: true,
      sign: 'up',
    },
  })
  backgroundChecks: {
    value: number;
    isPositive: boolean;
    sign: 'up' | 'down' | 'flat';
  };
}

export class AdminEmployerStatsDto {
  @ApiProperty({ example: 12 })
  totalEmployers: number;

  @ApiProperty({ example: 323 })
  activeJobPosts: number;

  @ApiProperty({ example: 980 })
  subscriptionActive: number;

  @ApiProperty({ example: 1000 })
  backgroundChecks: number;

  @ApiProperty({ type: AdminEmployerStatsTrendDto })
  trend: AdminEmployerStatsTrendDto;
}

export class AdminEmployerEngagementItemDto {
  @ApiProperty({ example: 'Mon' })
  day: string;

  @ApiProperty({ example: '2026-03-02' })
  date: string;

  @ApiProperty({ example: 21 })
  active: number;

  @ApiProperty({ example: 9 })
  inactive: number;
}

export class AdminEmployerEngagementResponseDto {
  @ApiProperty({ example: 'weekly' })
  period: string;

  @ApiProperty({ type: [AdminEmployerEngagementItemDto] })
  items: AdminEmployerEngagementItemDto[];
}

export class AdminEmployerJobTrendItemDto {
  @ApiProperty({ example: 'Jan' })
  month: string;

  @ApiProperty({ example: 45 })
  count: number;
}

export class AdminEmployerJobTrendResponseDto {
  @ApiProperty({ example: 'last_6_months' })
  period: string;

  @ApiProperty({ type: [AdminEmployerJobTrendItemDto] })
  items: AdminEmployerJobTrendItemDto[];
}

export class AdminEmployerRecentActivityItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'Smith Corp' })
  name: string;

  @ApiProperty({
    example: 'https://cdn.example.com/employer-avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Posted new job "Chef Assistant"' })
  action: string;

  @ApiProperty({ example: '2 hr ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-03-02T06:00:00.000Z' })
  occurredAt: Date;
}

export class AdminEmployerSubscriptionOverviewDto {
  @ApiProperty({ example: 1200 })
  total: number;

  @ApiProperty({ example: 980 })
  active: number;

  @ApiProperty({ example: 220 })
  expired: number;

  @ApiProperty({ example: 81.67 })
  activePercentage: number;

  @ApiProperty({ example: 18.33 })
  expiredPercentage: number;
}
