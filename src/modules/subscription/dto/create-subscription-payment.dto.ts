import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType } from '@prisma';
import { IsEnum } from 'class-validator';

export class CreateSubscriptionPaymentDto {
  @ApiProperty({
    enum: SubscriptionPlanType,
    enumName: 'SubscriptionPlanType',
    examples: [
      SubscriptionPlanType.employer_premium,
      SubscriptionPlanType.employee_premium,
    ],
  })
  @IsEnum(SubscriptionPlanType)
  planType: SubscriptionPlanType;
}
