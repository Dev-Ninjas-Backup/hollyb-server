import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmSubscriptionPaymentDto {
  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_1234567890',
  })
  @IsString()
  paymentIntentId: string;
}
