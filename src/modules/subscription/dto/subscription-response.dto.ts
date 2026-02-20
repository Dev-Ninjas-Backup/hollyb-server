import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType, SubscriptionStatus } from '@prisma';

export class PaymentConfigDataDto {
  @ApiProperty({
    example: 'pk_test_51ABC...XYZ',
  })
  publishableKey: string;
}

export class SubscriptionPaymentInfoDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  subscriptionId: string;

  @ApiProperty({ enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  status: SubscriptionStatus;

  @ApiProperty({
    enum: SubscriptionPlanType,
    enumName: 'SubscriptionPlanType',
  })
  planType: SubscriptionPlanType;

  @ApiProperty({ example: '3.99' })
  amount: string;

  @ApiProperty({ example: '2026-02-20T12:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-03-20T12:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ example: '3f5c1cb4-5f4d-4ae4-b02e-66d7f8d8a9a1' })
  paymentId: string;
}

export class ProcessSubscriptionPaymentDataDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example:
      'Payment successful. Your account has been verified and activated for job access.',
  })
  message: string;

  @ApiProperty({ type: SubscriptionPaymentInfoDto })
  subscription: SubscriptionPaymentInfoDto;
}

export class RenewSubscriptionDataDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: 'Your subscription has been successfully renewed.',
  })
  message: string;

  @ApiProperty({ type: SubscriptionPaymentInfoDto })
  subscription: SubscriptionPaymentInfoDto;
}

export class UserSubscriptionItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: SubscriptionPlanType, enumName: 'SubscriptionPlanType' })
  planType: SubscriptionPlanType;

  @ApiProperty({ example: '3.99' })
  amount: string;

  @ApiProperty({ enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  status: SubscriptionStatus;

  @ApiProperty({ example: '2026-02-20T12:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-03-20T12:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ example: false })
  isExpired: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isRunning: boolean;

  @ApiProperty({ example: false, required: false })
  canRenew?: boolean;
}

export class CurrentSubscriptionStateDto {
  @ApiProperty({ example: true })
  hasSubscription: boolean;

  @ApiProperty({ example: true })
  hasActiveSubscription: boolean;

  @ApiProperty({
    type: UserSubscriptionItemDto,
    nullable: true,
  })
  subscription: UserSubscriptionItemDto | null;
}

export class StripeWebhookReceivedDto {
  @ApiProperty({ example: true })
  received: boolean;
}
