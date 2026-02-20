import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RenewSubscriptionDto {
  @ApiProperty({
    description: 'Subscription UUID to renew',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({
    description: 'Stripe payment method id from client-side Stripe SDK',
    example: 'pm_1QxYzAbCdEfGhIjKlMnOpQr',
  })
  @IsString()
  paymentMethodId: string;
}
