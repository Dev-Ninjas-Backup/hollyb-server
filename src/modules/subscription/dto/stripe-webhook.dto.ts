import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookDto {
  @ApiProperty({
    description: 'Raw request body from Stripe for signature verification',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Stripe signature header for verification',
  })
  @IsString()
  signature: string;
}
