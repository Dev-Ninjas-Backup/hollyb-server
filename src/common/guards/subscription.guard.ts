import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma';
import { BusinessException } from '@/common/exceptions/business.exception';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new BusinessException(
        'User not found in request',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        is_demo: true,
      },
    });

    if (!user) {
      throw new BusinessException('User not found', HttpStatus.NOT_FOUND);
    }

    // ✅ Skip subscription check for demo accounts
    if (user.is_demo) {
      return true;
    }

    // Normal check — verify latest subscription is active
    const latestSubscription = await this.prisma.client.subscription.findFirst({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 1,
      select: {
        status: true,
        end_date: true,
      },
    });

    if (!latestSubscription) {
      response.status(HttpStatus.FORBIDDEN).send('Active subscription required');
      return false;
    }

    const now = new Date();
    const isExpired = now > latestSubscription.end_date;

    if (latestSubscription.status !== SubscriptionStatus.active || isExpired) {
      response.status(HttpStatus.FORBIDDEN).send('Active subscription required');
      return false;
    }

    return true;
  }
}
