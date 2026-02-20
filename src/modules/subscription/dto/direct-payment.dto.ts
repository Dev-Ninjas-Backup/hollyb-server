import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType } from '@prisma';
import { IsEnum, IsString } from 'class-validator';

export class DirectPaymentDto {
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

  @ApiProperty({
    description: 'Stripe payment method id from client-side Stripe SDK',
    example: 'pm_1QxYzAbCdEfGhIjKlMnOpQr',
  })
  @IsString()
  paymentMethodId: string;
}
