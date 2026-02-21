import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType, SubscriptionStatus } from '@prisma';

export class AdminSubscriptionListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Test Bites' })
  userName: string;

  @ApiProperty({ example: 'employer' })
  userType: 'employer' | 'employee';

  @ApiProperty({ enum: SubscriptionPlanType, enumName: 'SubscriptionPlanType' })
  planType: SubscriptionPlanType;

  @ApiProperty({
    enum: [
      SubscriptionStatus.active,
      SubscriptionStatus.expired,
      SubscriptionStatus.cancelled,
      'expiring_soon',
    ],
    example: 'expiring_soon',
  })
  status: SubscriptionStatus | 'expiring_soon';

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ example: '9.99' })
  amount: string;

  @ApiProperty({ example: false })
  isExpired: boolean;

  @ApiProperty({ example: false })
  isExpiringSoon: boolean;
}

export class AdminSubscriptionActivityItemDto {
  @ApiProperty({ example: 'Urban Café' })
  userName: string;

  @ApiProperty({ example: 'employer' })
  userType: 'employer' | 'employee';

  @ApiProperty({ example: 'Subscription Renewed' })
  action: string;

  @ApiProperty({ example: '2 hrs ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-02-21T05:00:00.000Z' })
  createdAt: Date;
}

export class AdminRevenueTrendItemDto {
  @ApiProperty({ example: 'Oct' })
  label: string;

  @ApiProperty({ example: '7540.00' })
  amount: string;
}

export class AdminSubscriptionSummaryResponseDto {
  @ApiProperty({ example: 1980 })
  totalSubscriptions: number;

  @ApiProperty({ example: 820 })
  employerSubscriptions: number;

  @ApiProperty({ example: 1160 })
  employeeSubscriptions: number;

  @ApiProperty({ example: '7540.00' })
  monthlyRevenue: string;

  @ApiProperty({ example: 18 })
  growthRatePercent: number;

  @ApiProperty({ type: [AdminRevenueTrendItemDto] })
  revenueTrend: AdminRevenueTrendItemDto[];
}
