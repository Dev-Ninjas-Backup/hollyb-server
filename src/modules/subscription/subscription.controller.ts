import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  AuthenticatedRequest,
} from '@/common/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { DirectPaymentDto } from './dto/direct-payment.dto';
import Stripe from 'stripe';

const hideInSwaggerOutsideDevelopment = (): MethodDecorator => {
  if (process.env.NODE_ENV === 'development') {
    return () => undefined;
  }

  return ApiExcludeEndpoint();
};

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('payment/config')
  @hideInSwaggerOutsideDevelopment()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPaymentConfig() {
    return this.subscriptionService.getPaymentConfig();
  }

  @Post('payment/process')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async processDirectPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DirectPaymentDto,
  ) {
    return this.subscriptionService.processDirectPayment(req.user.sub, dto);
  }

  @Get('my-subscriptions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getUserSubscriptions(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.getUserSubscription(req.user.sub);
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = JSON.parse(req.rawBody) as Stripe.Event;
    await this.subscriptionService.handleStripeWebhook(event);
    return { received: true };
  }
}
