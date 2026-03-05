import { Injectable } from '@nestjs/common';
import {
  BackgroundCheckStatus,
  JobStatus,
  SubscriptionPlanType,
  SubscriptionStatus,
  UserRole,
} from '@prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { createPaginationMeta } from '@/common/utils/response.helper';
import { AdminEmployerActivityQueryDto } from './dto';

type EmployerActivityItem = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  action: string;
  occurredAt: Date;
};

@Injectable()
export class EmployersService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();

    const [
      totalEmployers,
      activeJobPosts,
      subscriptionActive,
      backgroundChecks,
      currentMonthTotalEmployers,
      currentMonthActiveJobPosts,
      currentMonthSubscriptionActive,
      currentMonthBackgroundChecks,
      previousTotalEmployers,
      previousActiveJobPosts,
      previousSubscriptionActive,
      previousBackgroundChecks,
    ] = await Promise.all([
      this.prisma.client.employerProfile.count(),
      this.prisma.client.job.count({
        where: {
          employer: { user: { role: UserRole.employer } },
          status: { in: [JobStatus.open, JobStatus.assigned] },
        },
      }),
      this.prisma.client.subscription.count({
        where: {
          plan_type: SubscriptionPlanType.employer_premium,
          status: SubscriptionStatus.active,
          end_date: { gte: now },
        },
      }),
      this.prisma.client.user.count({
        where: {
          role: UserRole.employer,
          is_verified: true,
          is_deleted: false,
        },
      }),
      this.getCurrentMonthEmployerCount(),
      this.getCurrentMonthActiveJobPostCount(),
      this.getCurrentMonthSubscriptionActiveCount(),
      this.getCurrentMonthVerifiedEmployerCount(),
      this.getPreviousMonthEmployerCount(),
      this.getPreviousMonthActiveJobPostCount(),
      this.getPreviousMonthSubscriptionActiveCount(),
      this.getPreviousMonthVerifiedEmployerCount(),
    ]);

    return {
      totalEmployers,
      activeJobPosts,
      subscriptionActive,
      backgroundChecks,
      trend: {
        totalEmployers: this.toTrendMetric(
          currentMonthTotalEmployers,
          previousTotalEmployers,
        ),
        activeJobPosts: this.toTrendMetric(
          currentMonthActiveJobPosts,
          previousActiveJobPosts,
        ),
        subscriptionActive: this.toTrendMetric(
          currentMonthSubscriptionActive,
          previousSubscriptionActive,
        ),
        backgroundChecks: this.toTrendMetric(
          currentMonthBackgroundChecks,
          previousBackgroundChecks,
        ),
      },
    };
  }

  async getEngagementInsights() {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const totalEmployers = await this.prisma.client.employerProfile.count();
    const items: Array<{
      day: string;
      date: string;
      active: number;
      inactive: number;
    }> = [];

    for (let offset = 6; offset >= 0; offset--) {
      const dayStart = new Date(endOfToday);
      dayStart.setDate(endOfToday.getDate() - offset);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const active = await this.prisma.client.employerProfile.count({
        where: {
          user: {
            is_deleted: false,
            last_active_at: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        },
      });

      items.push({
        day: dayStart.toLocaleString('en-US', { weekday: 'short' }),
        date: dayStart.toISOString().split('T')[0],
        active,
        inactive: Math.max(totalEmployers - active, 0),
      });
    }

    return {
      period: 'weekly',
      items,
    };
  }

  async getJobPostTrends() {
    const now = new Date();
    const items: Array<{ month: string; count: number }> = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const count = await this.prisma.client.job.count({
        where: {
          created_at: { gte: start, lte: end },
          employer: { user: { role: UserRole.employer } },
        },
      });

      items.push({
        month: start.toLocaleString('en-US', { month: 'short' }),
        count,
      });
    }

    return {
      period: 'last_6_months',
      items,
    };
  }

  async getRecentActivities(query: AdminEmployerActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sourceTake = Math.max(limit * page, 30);

    const [
      employerRegistrations,
      postedJobs,
      employerSubscriptions,
      backgroundChecks,
    ] = await Promise.all([
      this.prisma.client.user.findMany({
        where: {
          role: UserRole.employer,
          is_deleted: false,
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          id: true,
          full_name: true,
          created_at: true,
          employer_profile: {
            select: {
              company_name: true,
              profile_photo_url: true,
            },
          },
        },
      }),
      this.prisma.client.job.findMany({
        where: {
          employer: { user: { role: UserRole.employer } },
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          title: true,
          created_at: true,
          employer: {
            select: {
              user_id: true,
              company_name: true,
              profile_photo_url: true,
              user: {
                select: {
                  full_name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.client.subscription.findMany({
        where: {
          plan_type: SubscriptionPlanType.employer_premium,
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          user_id: true,
          created_at: true,
          amount: true,
          user: {
            select: {
              full_name: true,
              employer_profile: {
                select: {
                  company_name: true,
                  profile_photo_url: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.client.backgroundCheck.findMany({
        where: {
          status: BackgroundCheckStatus.passed,
          user: { role: UserRole.employer },
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          user_id: true,
          checked_at: true,
          created_at: true,
          user: {
            select: {
              full_name: true,
              employer_profile: {
                select: {
                  company_name: true,
                  profile_photo_url: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const subscriptionCounts = await this.prisma.client.subscription.groupBy({
      by: ['user_id'],
      where: {
        plan_type: SubscriptionPlanType.employer_premium,
      },
      _count: {
        _all: true,
      },
    });

    const subscriptionCountMap = new Map(
      subscriptionCounts.map((row) => [row.user_id, row._count._all]),
    );

    const allActivities: EmployerActivityItem[] = [
      ...employerRegistrations.map((row) => ({
        userId: row.id,
        name: row.employer_profile?.company_name ?? row.full_name,
        avatarUrl: row.employer_profile?.profile_photo_url ?? null,
        action: 'Employer registration completed',
        occurredAt: row.created_at,
      })),
      ...postedJobs.map((row) => ({
        userId: row.employer.user_id,
        name: row.employer.company_name ?? row.employer.user.full_name,
        avatarUrl: row.employer.profile_photo_url,
        action: `Posted new job \"${row.title}\"`,
        occurredAt: row.created_at,
      })),
      ...employerSubscriptions.map((row) => {
        const totalForUser = subscriptionCountMap.get(row.user_id) ?? 1;
        return {
          userId: row.user_id,
          name: row.user.employer_profile?.company_name ?? row.user.full_name,
          avatarUrl: row.user.employer_profile?.profile_photo_url ?? null,
          action:
            totalForUser > 1
              ? `Subscription renewed (USD ${String(row.amount)})`
              : `Subscription started (USD ${String(row.amount)})`,
          occurredAt: row.created_at,
        };
      }),
      ...backgroundChecks.map((row) => ({
        userId: row.user_id,
        name: row.user.employer_profile?.company_name ?? row.user.full_name,
        avatarUrl: row.user.employer_profile?.profile_photo_url ?? null,
        action: 'Background check completed',
        occurredAt: row.checked_at ?? row.created_at,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = allActivities.slice(startIndex, endIndex).map((activity) => ({
      userId: activity.userId,
      name: activity.name,
      avatarUrl: activity.avatarUrl,
      action: activity.action,
      relativeTime: this.toRelativeTime(activity.occurredAt),
      occurredAt: activity.occurredAt,
    }));

    return {
      items,
      meta: createPaginationMeta(allActivities.length, page, limit),
    };
  }

  async getSubscriptionOverview() {
    const now = new Date();

    const [active, expired] = await Promise.all([
      this.prisma.client.subscription.count({
        where: {
          plan_type: SubscriptionPlanType.employer_premium,
          status: SubscriptionStatus.active,
          end_date: { gte: now },
        },
      }),
      this.prisma.client.subscription.count({
        where: {
          plan_type: SubscriptionPlanType.employer_premium,
          OR: [
            {
              status: {
                in: [SubscriptionStatus.expired, SubscriptionStatus.cancelled],
              },
            },
            {
              end_date: { lt: now },
            },
          ],
        },
      }),
    ]);

    const total = active + expired;
    const activePercentage =
      total === 0 ? 0 : Number(((active / total) * 100).toFixed(2));
    const expiredPercentage =
      total === 0 ? 0 : Number(((expired / total) * 100).toFixed(2));

    return {
      total,
      active,
      expired,
      activePercentage,
      expiredPercentage,
    };
  }

  private toPercentChange(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private toTrendMetric(current: number, previous: number) {
    const value = this.toPercentChange(current, previous);
    return {
      value,
      isPositive: value > 0,
      sign: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
    };
  }

  private toRelativeTime(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
      return 'just now';
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    if (days < 7) {
      return `${days} day ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return `${weeks} week ago`;
    }

    const months = Math.floor(days / 30);
    return `${months} month ago`;
  }

  private getCurrentMonthRange() {
    const now = new Date();
    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endCurrentMonth = new Date(
      startCurrentMonth.getFullYear(),
      startCurrentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return {
      startCurrentMonth,
      endCurrentMonth,
    };
  }

  private getPreviousMonthRange() {
    const now = new Date();
    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPreviousMonth = new Date(
      startCurrentMonth.getFullYear(),
      startCurrentMonth.getMonth() - 1,
      1,
    );
    const endPreviousMonth = new Date(startCurrentMonth.getTime() - 1);

    return {
      startPreviousMonth,
      endPreviousMonth,
    };
  }

  private async getCurrentMonthEmployerCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.employerProfile.count({
      where: {
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    });
  }

  private async getPreviousMonthEmployerCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.employerProfile.count({
      where: {
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getCurrentMonthActiveJobPostCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.job.count({
      where: {
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
        employer: { user: { role: UserRole.employer } },
        status: {
          in: [JobStatus.open, JobStatus.assigned],
        },
      },
    });
  }

  private async getPreviousMonthActiveJobPostCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.job.count({
      where: {
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
        employer: { user: { role: UserRole.employer } },
        status: {
          in: [JobStatus.open, JobStatus.assigned],
        },
      },
    });
  }

  private async getCurrentMonthSubscriptionActiveCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.subscription.count({
      where: {
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
        plan_type: SubscriptionPlanType.employer_premium,
        status: SubscriptionStatus.active,
      },
    });
  }

  private async getPreviousMonthSubscriptionActiveCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.subscription.count({
      where: {
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
        plan_type: SubscriptionPlanType.employer_premium,
        status: SubscriptionStatus.active,
      },
    });
  }

  private async getCurrentMonthVerifiedEmployerCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.user.count({
      where: {
        role: UserRole.employer,
        is_verified: true,
        is_deleted: false,
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    });
  }

  private async getPreviousMonthVerifiedEmployerCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.user.count({
      where: {
        role: UserRole.employer,
        is_verified: true,
        is_deleted: false,
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }
}
