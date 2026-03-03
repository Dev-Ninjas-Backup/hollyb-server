import { ApiProperty } from '@nestjs/swagger';

export class ReportAnalyticsTrendMetricDto {
  @ApiProperty({ example: 18 })
  value: number;

  @ApiProperty({ example: true })
  isPositive: boolean;

  @ApiProperty({ enum: ['up', 'down', 'flat'], example: 'up' })
  sign: 'up' | 'down' | 'flat';
}

export class ReportAnalyticsStatsTrendDto {
  @ApiProperty({ type: ReportAnalyticsTrendMetricDto })
  totalUsers: ReportAnalyticsTrendMetricDto;

  @ApiProperty({ type: ReportAnalyticsTrendMetricDto })
  totalJobs: ReportAnalyticsTrendMetricDto;

  @ApiProperty({ type: ReportAnalyticsTrendMetricDto })
  totalRevenue: ReportAnalyticsTrendMetricDto;

  @ApiProperty({ type: ReportAnalyticsTrendMetricDto })
  growthRate: ReportAnalyticsTrendMetricDto;
}

export class ReportAnalyticsStatsResponseDto {
  @ApiProperty({ example: 3740 })
  totalUsers: number;

  @ApiProperty({ example: 2450 })
  totalJobs: number;

  @ApiProperty({ example: 7540 })
  totalRevenue: number;

  @ApiProperty({ example: 12 })
  growthRate: number;

  @ApiProperty({ type: ReportAnalyticsStatsTrendDto })
  trend: ReportAnalyticsStatsTrendDto;
}

export class ReportAnalyticsJobsPostedCompletedItemDto {
  @ApiProperty({ example: 'Sat' })
  label: string;

  @ApiProperty({ example: 24 })
  jobsPosted: number;

  @ApiProperty({ example: 18 })
  jobsCompleted: number;
}

export class ReportAnalyticsJobPostedCompletedResponseDto {
  @ApiProperty({ example: 'weekly' })
  period: string;

  @ApiProperty({ type: [ReportAnalyticsJobsPostedCompletedItemDto] })
  items: ReportAnalyticsJobsPostedCompletedItemDto[];
}

export class ReportAnalyticsSubscriptionOverviewDto {
  @ApiProperty({ example: 1200 })
  total: number;

  @ApiProperty({ example: 900 })
  active: number;

  @ApiProperty({ example: 300 })
  expired: number;

  @ApiProperty({ example: 75 })
  activePercentage: number;

  @ApiProperty({ example: 25 })
  expiredPercentage: number;
}

export class ReportAnalyticsTopEmployerItemDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'TechCorp Solution' })
  name: string;

  @ApiProperty({ example: 45 })
  totalJobs: number;

  @ApiProperty({ example: 38 })
  completedJobs: number;

  @ApiProperty({ example: 98 })
  completionRate: number;
}

export class ReportAnalyticsTopEmployeeItemDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Marcus Johnson' })
  name: string;

  @ApiProperty({ example: 4.75 })
  averageRating: number;

  @ApiProperty({ example: 45 })
  totalJobs: number;

  @ApiProperty({ example: 38 })
  completedJobs: number;

  @ApiProperty({ example: 98 })
  completionRate: number;
}

export class ReportAnalyticsTopSellerItemDto {
  @ApiProperty({ example: 'Employer Engagement' })
  reportType: string;

  @ApiProperty({ example: 'Percentage of employers posting jobs this month' })
  description: string;

  @ApiProperty({ example: '78.00%' })
  currentValue: string;

  @ApiProperty({ type: ReportAnalyticsTrendMetricDto })
  trend: ReportAnalyticsTrendMetricDto;

  @ApiProperty({ example: '2026-03-03T10:00:00.000Z' })
  lastUpdated: Date;
}

export class ReportAnalyticsRecentActivityItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  actorId: string;

  @ApiProperty({ example: 'Smith Corp' })
  actorName: string;

  @ApiProperty({ enum: ['employee', 'employer'], example: 'employer' })
  actorType: 'employee' | 'employer';

  @ApiProperty({
    example: 'https://cdn.example.com/avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Posted new job "Chef Assistant"' })
  action: string;

  @ApiProperty({ example: '2 hr ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-03-03T10:00:00.000Z' })
  occurredAt: Date;
}
