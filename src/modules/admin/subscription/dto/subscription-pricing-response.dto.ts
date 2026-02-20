import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType } from '@prisma';

export class SubscriptionPricingPlanDto {
  @ApiProperty({
    enum: SubscriptionPlanType,
    enumName: 'SubscriptionPlanType',
  })
  planType: SubscriptionPlanType;

  @ApiProperty({ example: 'Premium' })
  title: string;

  @ApiProperty({ example: '9.99' })
  amount: string;

  @ApiProperty({ example: 'monthly' })
  billingCycle: 'monthly';
}

export class SubscriptionPricingResponseDto {
  @ApiProperty({ type: SubscriptionPricingPlanDto })
  employerPlan: SubscriptionPricingPlanDto;

  @ApiProperty({ type: SubscriptionPricingPlanDto })
  employeePlan: SubscriptionPricingPlanDto;
}
