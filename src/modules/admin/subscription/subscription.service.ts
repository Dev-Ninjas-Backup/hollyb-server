import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PaymentStatus,
  PaymentType,
  SubscriptionPlanType,
  SubscriptionStatus,
  UserRole,
} from '@prisma';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';
import {
  AdminDateRangePreset,
  AdminSubscriptionQueryDto,
  AdminSubscriptionStatusFilter,
  AdminSubscriptionUserType,
} from './dto/admin-subscription-query.dto';
import { createPaginationMeta } from '@/common/utils/response.helper';

const EXPIRING_SOON_STATUS = 'expiring_soon' as const;

type PricingView = {
  planType: SubscriptionPlanType;
  title: string;
  amount: string;
  billingCycle: 'monthly';
};

@Injectable()
export class SubscriptionService {
  private readonly settings = {
    [SubscriptionPlanType.employer_premium]: {
      key: 'subscription.pricing.employer_premium.monthly',
      title: 'Premium',
      fallbackAmount: '9.99',
    },
    [SubscriptionPlanType.employee_premium]: {
      key: 'subscription.pricing.employee_premium.monthly',
      title: 'Premium',
      fallbackAmount: '3.99',
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(query: AdminSubscriptionQueryDto) {
    const now = new Date();
    const { from, to } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(from && to
        ? {
            created_at: {
              gte: from,
              lte: to,
            },
          }
        : {}),
      user: {
        role:
          query.userType === AdminSubscriptionUserType.all || !query.userType
            ? { in: [UserRole.employer, UserRole.employee] }
            : query.userType,
      },
    };

    if (query.status === AdminSubscriptionStatusFilter.active) {
      where.status = SubscriptionStatus.active;
      where.end_date = { gt: now };
    }

    if (query.status === AdminSubscriptionStatusFilter.expired) {
      where.OR = [
        { end_date: { lte: now } },
        {
          status: {
            in: [SubscriptionStatus.expired, SubscriptionStatus.cancelled],
          },
        },
      ];
    }

    if (query.status === AdminSubscriptionStatusFilter.expiring_soon) {
      const next7Days = new Date(now);
      next7Days.setDate(next7Days.getDate() + 7);

      where.status = SubscriptionStatus.active;
      where.end_date = {
        gt: now,
        lte: next7Days,
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.client.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              full_name: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.client.subscription.count({ where }),
    ]);

    const items = rows.map((row) => {
      const isExpired = row.end_date <= now;
      const expiringLimit = new Date(now);
      expiringLimit.setDate(expiringLimit.getDate() + 7);
      const isExpiringSoon =
        row.status === SubscriptionStatus.active &&
        row.end_date > now &&
        row.end_date <= expiringLimit;

      return {
        id: row.id,
        userName: row.user.full_name,
        userType: row.user.role,
        planType: row.plan_type,
        status: isExpired
          ? SubscriptionStatus.expired
          : isExpiringSoon
            ? EXPIRING_SOON_STATUS
            : row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        amount: String(row.amount),
        isExpired,
        isExpiringSoon,
      };
    });

    return {
      items,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getRecentActivities(query: AdminSubscriptionQueryDto) {
    const now = new Date();
    const { from, to } = this.resolveDateRange(query);

    const where: any = {
      ...(from && to
        ? {
            created_at: {
              gte: from,
              lte: to,
            },
          }
        : {}),
      user: {
        role:
          query.userType === AdminSubscriptionUserType.all || !query.userType
            ? { in: [UserRole.employer, UserRole.employee] }
            : query.userType,
      },
    };

    const [rows, groupedCounts] = await Promise.all([
      this.prisma.client.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              full_name: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      }),
      this.prisma.client.subscription.groupBy({
        by: ['user_id'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const countMap = new Map(
      groupedCounts.map((item) => [item.user_id, item._count._all]),
    );

    return rows.map((row) => {
      const totalForUser = countMap.get(row.user_id) ?? 1;
      const isExpired = row.end_date <= now;
      let action = 'New Subscription Started';

      if (isExpired || row.status === SubscriptionStatus.expired) {
        action = 'Subscription Expired';
      } else if (totalForUser > 1) {
        action = 'Subscription Renewed';
      }

      return {
        userName: row.user.full_name,
        userType: row.user.role,
        action,
        relativeTime: this.toRelativeTime(row.created_at),
        createdAt: row.created_at,
      };
    });
  }

  async getSummary(query: AdminSubscriptionQueryDto) {
    const { from, to } = this.resolveDateRange(query);

    const baseWhere: any = {
      ...(from && to
        ? {
            created_at: {
              gte: from,
              lte: to,
            },
          }
        : {}),
      user: {
        role:
          query.userType === AdminSubscriptionUserType.all || !query.userType
            ? { in: [UserRole.employer, UserRole.employee] }
            : query.userType,
      },
    };

    const [totalSubscriptions, employerSubscriptions, employeeSubscriptions] =
      await Promise.all([
        this.prisma.client.subscription.count({
          where: baseWhere,
        }),
        this.prisma.client.subscription.count({
          where: {
            ...baseWhere,
            user: { role: UserRole.employer },
          },
        }),
        this.prisma.client.subscription.count({
          where: {
            ...baseWhere,
            user: { role: UserRole.employee },
          },
        }),
      ]);

    const revenueTrend = await this.getRecentMonthsRevenueTrend();
    const currentMonthIndex = new Date().getMonth();
    const monthlyRevenue = Number(revenueTrend[currentMonthIndex]?.amount ?? 0);
    const previousMonthRevenue =
      currentMonthIndex > 0
        ? Number(revenueTrend[currentMonthIndex - 1]?.amount ?? 0)
        : 0;
    const growthRatePercent =
      previousMonthRevenue <= 0
        ? monthlyRevenue > 0
          ? 100
          : 0
        : Number(
            (
              ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) *
              100
            ).toFixed(2),
          );

    return {
      totalSubscriptions,
      employerSubscriptions,
      employeeSubscriptions,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      growthRatePercent,
      revenueTrend: revenueTrend.map((row) => ({
        label: row.label,
        amount: row.amount.toFixed(2),
      })),
    };
  }

  async getPricing() {
    await this.ensurePricingSettings();

    const [employer, employee] = await Promise.all([
      this.prisma.client.systemSetting.findUnique({
        where: {
          key: this.settings[SubscriptionPlanType.employer_premium].key,
        },
      }),
      this.prisma.client.systemSetting.findUnique({
        where: {
          key: this.settings[SubscriptionPlanType.employee_premium].key,
        },
      }),
    ]);

    return {
      employerPlan: this.toView(
        SubscriptionPlanType.employer_premium,
        employer?.value,
      ),
      employeePlan: this.toView(
        SubscriptionPlanType.employee_premium,
        employee?.value,
      ),
    };
  }

  async updatePricing(dto: UpdateSubscriptionPricingDto) {
    const setting = this.settings[dto.planType];
    const amount = dto.amount.toFixed(2);

    await this.prisma.client.systemSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: amount,
        description: `${dto.planType} monthly subscription amount`,
      },
      update: {
        value: amount,
      },
    });

    return this.toView(dto.planType, amount);
  }

  private toView(
    planType: SubscriptionPlanType,
    amount?: string | null,
  ): PricingView {
    const setting = this.settings[planType];
    return {
      planType,
      title: setting.title,
      amount: amount || setting.fallbackAmount,
      billingCycle: 'monthly',
    };
  }

  private async ensurePricingSettings() {
    await Promise.all([
      this.prisma.client.systemSetting.upsert({
        where: {
          key: this.settings[SubscriptionPlanType.employer_premium].key,
        },
        create: {
          key: this.settings[SubscriptionPlanType.employer_premium].key,
          value:
            this.settings[SubscriptionPlanType.employer_premium].fallbackAmount,
          description: 'Employer premium monthly subscription amount',
        },
        update: {},
      }),
      this.prisma.client.systemSetting.upsert({
        where: {
          key: this.settings[SubscriptionPlanType.employee_premium].key,
        },
        create: {
          key: this.settings[SubscriptionPlanType.employee_premium].key,
          value:
            this.settings[SubscriptionPlanType.employee_premium].fallbackAmount,
          description: 'Employee premium monthly subscription amount',
        },
        update: {},
      }),
    ]);
  }

  private resolveDateRange(query: AdminSubscriptionQueryDto) {
    const now = new Date();

    if (query.dateRange === AdminDateRangePreset.last_month) {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
      return { from, to };
    }

    if (
      query.dateRange === AdminDateRangePreset.custom &&
      query.fromDate &&
      query.toDate
    ) {
      const from = new Date(`${query.fromDate}T00:00:00.000Z`);
      const to = new Date(`${query.toDate}T23:59:59.999Z`);
      return { from, to };
    }

    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { from, to };
  }

  private toRelativeTime(date: Date) {
    const diffMs = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));

    if (minutes < 60) {
      return `${Math.max(minutes, 1)} mins ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hrs ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  private async getRecentMonthsRevenueTrend() {
    const now = new Date();
    const months: Array<{ label: string; amount: number }> = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const firstDay = new Date(now.getFullYear(), monthIndex, 1);
      const lastDay = new Date(
        now.getFullYear(),
        monthIndex + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const payments = await this.prisma.client.payment.findMany({
        where: {
          type: PaymentType.subscription,
          status: PaymentStatus.success,
          created_at: {
            gte: firstDay,
            lte: lastDay,
          },
        },
        select: {
          amount: true,
        },
      });

      const amount = payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );

      months.push({
        label: firstDay.toLocaleString('en-US', { month: 'short' }),
        amount,
      });
    }

    return months;
  }
}
