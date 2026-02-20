import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import {
  SubscriptionPlanType,
  SubscriptionStatus,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
} from '@prisma';
import { DirectPaymentDto } from './dto/direct-payment.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe;
  private readonly adminPricingKeys = {
    [SubscriptionPlanType.employer_premium]:
      'subscription.pricing.employer_premium.monthly',
    [SubscriptionPlanType.employee_premium]:
      'subscription.pricing.employee_premium.monthly',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey =
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey);
  }

  getPaymentConfig() {
    if (process.env.NODE_ENV !== 'development') {
      throw new BusinessException('Not Found', HttpStatus.NOT_FOUND);
    }

    return {
      publishableKey: this.configService.getOrThrow<string>(
        'STRIPE_PUBLISHABLE_KEY',
      ),
    };
  }

  async processDirectPayment(userId: string, dto: DirectPaymentDto) {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BusinessException('User not found', HttpStatus.NOT_FOUND);
      }

      const existingSubscription =
        await this.prisma.client.subscription.findFirst({
          where: {
            user_id: userId,
            status: SubscriptionStatus.active,
            plan_type: dto.planType,
          },
        });

      if (existingSubscription) {
        throw new BusinessException(
          'You already have an active subscription for this plan',
          HttpStatus.CONFLICT,
        );
      }

      const amount = await this.getPlanAmount(dto.planType);
      const amountInCents = Math.round(Number(amount) * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        payment_method: dto.paymentMethodId,
        confirm: true,
        metadata: {
          userId,
          planType: dto.planType,
        },
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new BusinessException(
          'Payment processing failed. Please try again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const payment = await this.prisma.client.payment.create({
        data: {
          user_id: userId,
          type: PaymentType.subscription,
          amount: String((paymentIntent.amount / 100).toFixed(2)),
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: PaymentMethod.card,
          transaction_id: paymentIntent.id,
          status: PaymentStatus.success,
          paid_at: new Date(),
        },
      });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = await this.prisma.client.subscription.create({
        data: {
          user_id: userId,
          plan_type: dto.planType,
          amount: String((paymentIntent.amount / 100).toFixed(2)),
          payment_id: payment.id,
          start_date: startDate,
          end_date: endDate,
          status: SubscriptionStatus.active,
        },
      });

      this.logger.log(
        `Direct payment processed for user ${userId}: ${dto.planType}`,
      );

      return {
        success: true,
        message:
          'Payment successful. Your account has been verified and activated for job access.',
        subscription: {
          subscriptionId: subscription.id,
          status: subscription.status,
          planType: subscription.plan_type,
          amount: subscription.amount,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          paymentId: payment.id,
        },
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new BusinessException(
          error.message ||
            'Card payment failed. Please check card details and try again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        throw new BusinessException(
          error.message || 'Invalid payment request. Please try again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.error(`Direct payment failed: ${error.message}`);
      if (error instanceof BusinessException) throw error;
      throw new BusinessException(
        'Payment processing failed. Please try again.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserSubscription(userId: string) {
    const subscriptions = await this.prisma.client.subscription.findMany({
      where: { user_id: userId },
      include: { payment: true },
      orderBy: { created_at: 'desc' },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      planType: sub.plan_type,
      amount: sub.amount,
      status: sub.status,
      startDate: sub.start_date,
      endDate: sub.end_date,
      isExpired: new Date() > sub.end_date,
    }));
  }

  async checkActiveSubscription(
    userId: string,
    planType: SubscriptionPlanType,
  ) {
    const subscription = await this.prisma.client.subscription.findFirst({
      where: {
        user_id: userId,
        plan_type: planType,
        status: SubscriptionStatus.active,
        end_date: {
          gt: new Date(),
        },
      },
    });

    return !!subscription;
  }

  async handleStripeWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          this.logger.log(`Payment intent succeeded: ${event.data.object.id}`);
          break;

        case 'payment_intent.payment_failed':
          this.logger.warn(`Payment intent failed: ${event.data.object.id}`);
          break;

        case 'charge.refunded':
          await this.handleRefund(event.data.object as Stripe.Charge);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook handler error: ${error.message}`);
      throw error;
    }
  }

  private async handleRefund(charge: Stripe.Charge) {
    const payment = await this.prisma.client.payment.findUnique({
      where: { transaction_id: charge.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for charge: ${charge.id}`);
      return;
    }

    await this.prisma.client.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.refunded },
    });

    const subscription = await this.prisma.client.subscription.findFirst({
      where: { payment_id: payment.id },
    });

    if (subscription) {
      await this.prisma.client.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.cancelled },
      });
    }

    this.logger.log(
      `Refund processed for charge ${charge.id}, subscription cancelled`,
    );
  }

  private async getPlanAmount(planType: SubscriptionPlanType): Promise<string> {
    const setting = await this.prisma.client.systemSetting.findUnique({
      where: {
        key: this.adminPricingKeys[planType],
      },
    });

    if (!setting || !setting.value) {
      throw new BusinessException(
        `Pricing for ${planType} not configured`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return setting.value;
  }
}
