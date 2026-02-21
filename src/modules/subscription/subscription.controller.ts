import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  AuthenticatedRequest,
} from '@/common/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { DirectPaymentDto } from './dto/direct-payment.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import Stripe from 'stripe';
import {
  ApiErrorResponses,
  ApiSuccessArrayResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import {
  CurrentSubscriptionStateDto,
  PaymentConfigDataDto,
  ProcessSubscriptionPaymentDataDto,
  RenewSubscriptionDataDto,
  StripeWebhookReceivedDto,
  UserSubscriptionItemDto,
} from './dto/subscription-response.dto';

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
  @ApiOperation({ summary: 'Get Stripe publishable key (development only)' })
  @UseGuards(JwtAuthGuard)
  getPaymentConfig() {
    return this.subscriptionService.getPaymentConfig();
  }

  @Post('payment/process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subscription payment' })
  @UseGuards(JwtAuthGuard)
  async processDirectPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DirectPaymentDto,
  ) {
    return this.subscriptionService.processDirectPayment(req.user.sub, dto);
  }

  @Post('renew')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew expired subscription' })
  @UseGuards(JwtAuthGuard)
  async renewSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RenewSubscriptionDto,
  ) {
    return this.subscriptionService.renewSubscription(req.user.sub, dto);
  }

  @Get('my-subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my all subscriptions' })
  @UseGuards(JwtAuthGuard)
  async getUserSubscriptions(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.getUserSubscription(req.user.sub);
  }

  @Get('my-subscriptions/current')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get latest subscription state (active or expired)',
  })
  @ApiSuccessResponse(CurrentSubscriptionStateDto, {
    description: 'Current subscription state retrieved successfully',
  })
  @ApiErrorResponses()
  @UseGuards(JwtAuthGuard)
  async getCurrentSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.getCurrentActiveSubscription(req.user.sub);
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = JSON.parse(req.rawBody) as Stripe.Event;
    await this.subscriptionService.handleStripeWebhook(event);
    return { received: true };
  }
}
