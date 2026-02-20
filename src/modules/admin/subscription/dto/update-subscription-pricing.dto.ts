import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType } from '@prisma';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class UpdateSubscriptionPricingDto {
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

  @ApiProperty({ example: 9.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}
