import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  BackgroundCheckStatus,
  JobStatus,
  ShiftStatus,
  SubscriptionPlanType,
  SubscriptionStatus,
  UserRole,
} from '@prisma';
import { createPaginationMeta } from '@/common/utils/response.helper';
import { OverviewRecentActivityQueryDto } from './dto/overview-recent-activity-query.dto';

type AdminRecentActivityItem = {
  actorId: string;
  actorName: string;
  actorType: 'employee' | 'employer';
  avatarUrl: string | null;
  action: string;
  occurredAt: Date;
};

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentActivity(query: OverviewRecentActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sourceTake = Math.max(page * limit, 30);

    const [
      employeeRegistrations,
      employerRegistrations,
      jobPosts,
      jobApplications,
      subscriptions,
      backgroundChecks,
      completedShifts,
    ] = await Promise.all([
      this.prisma.client.user.findMany({
        where: {
          role: UserRole.employee,
          is_deleted: false,
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          id: true,
          full_name: true,
          created_at: true,
          employee_profile: {
            select: {
              profile_photo_url: true,
            },
          },
        },
      }),
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
      this.prisma.client.jobApplication.findMany({
        orderBy: { applied_at: 'desc' },
        take: sourceTake,
        select: {
          applied_at: true,
          job: {
            select: {
              title: true,
            },
          },
          employee: {
            select: {
              user_id: true,
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
          plan_type: {
            in: [
              SubscriptionPlanType.employee_premium,
              SubscriptionPlanType.employer_premium,
            ],
          },
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          user_id: true,
          amount: true,
          created_at: true,
          user: {
            select: {
              role: true,
              full_name: true,
              employee_profile: {
                select: {
                  profile_photo_url: true,
                },
              },
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
        },
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          user_id: true,
          checked_at: true,
          created_at: true,
          user: {
            select: {
              role: true,
              full_name: true,
              employee_profile: {
                select: {
                  profile_photo_url: true,
                },
              },
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
      this.prisma.client.jobShift.findMany({
        where: {
          status: ShiftStatus.completed,
        },
        orderBy: { updated_at: 'desc' },
        take: sourceTake,
        select: {
          checked_out_at: true,
          updated_at: true,
          employee: {
            select: {
              user_id: true,
              profile_photo_url: true,
              user: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          job: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    const subscriptionCounts = await this.prisma.client.subscription.groupBy({
      by: ['user_id'],
      where: {
        plan_type: {
          in: [
            SubscriptionPlanType.employee_premium,
            SubscriptionPlanType.employer_premium,
          ],
        },
      },
      _count: {
        _all: true,
      },
    });

    const subscriptionCountMap = new Map(
      subscriptionCounts.map((row) => [row.user_id, row._count._all]),
    );

    const itemsAll: AdminRecentActivityItem[] = [
      ...employeeRegistrations.map((row) => ({
        actorId: row.id,
        actorName: row.full_name,
        actorType: 'employee' as const,
        avatarUrl: row.employee_profile?.profile_photo_url ?? null,
        action: 'Employee registration completed',
        occurredAt: row.created_at,
      })),
      ...employerRegistrations.map((row) => ({
        actorId: row.id,
        actorName: row.employer_profile?.company_name ?? row.full_name,
        actorType: 'employer' as const,
        avatarUrl: row.employer_profile?.profile_photo_url ?? null,
        action: 'Employer registration completed',
        occurredAt: row.created_at,
      })),
      ...jobPosts.map((row) => ({
        actorId: row.employer.user_id,
        actorName: row.employer.company_name ?? row.employer.user.full_name,
        actorType: 'employer' as const,
        avatarUrl: row.employer.profile_photo_url,
        action: `Posted new job \"${row.title}\"`,
        occurredAt: row.created_at,
      })),
      ...jobApplications.map((row) => ({
        actorId: row.employee.user_id,
        actorName: row.employee.user.full_name,
        actorType: 'employee' as const,
        avatarUrl: row.employee.profile_photo_url,
        action: `Applied to job \"${row.job.title}\"`,
        occurredAt: row.applied_at,
      })),
      ...subscriptions.map((row) => {
        const count = subscriptionCountMap.get(row.user_id) ?? 1;
        const isEmployer = row.user.role === UserRole.employer;

        return {
          actorId: row.user_id,
          actorName: isEmployer
            ? (row.user.employer_profile?.company_name ?? row.user.full_name)
            : row.user.full_name,
          actorType: isEmployer ? ('employer' as const) : ('employee' as const),
          avatarUrl: isEmployer
            ? (row.user.employer_profile?.profile_photo_url ?? null)
            : (row.user.employee_profile?.profile_photo_url ?? null),
          action:
            count > 1
              ? `Subscription renewed (USD ${String(row.amount)})`
              : `Subscription started (USD ${String(row.amount)})`,
          occurredAt: row.created_at,
        };
      }),
      ...backgroundChecks.map((row) => {
        const isEmployer = row.user.role === UserRole.employer;

        return {
          actorId: row.user_id,
          actorName: isEmployer
            ? (row.user.employer_profile?.company_name ?? row.user.full_name)
            : row.user.full_name,
          actorType: isEmployer ? ('employer' as const) : ('employee' as const),
          avatarUrl: isEmployer
            ? (row.user.employer_profile?.profile_photo_url ?? null)
            : (row.user.employee_profile?.profile_photo_url ?? null),
          action: 'Background check verified',
          occurredAt: row.checked_at ?? row.created_at,
        };
      }),
      ...completedShifts.map((row) => ({
        actorId: row.employee.user_id,
        actorName: row.employee.user.full_name,
        actorType: 'employee' as const,
        avatarUrl: row.employee.profile_photo_url,
        action: `Completed job \"${row.job.title}\"`,
        occurredAt: row.checked_out_at ?? row.updated_at,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = itemsAll.slice(startIndex, endIndex).map((item) => ({
      actorId: item.actorId,
      actorName: item.actorName,
      actorType: item.actorType,
      avatarUrl: item.avatarUrl,
      action: item.action,
      relativeTime: this.toRelativeTime(item.occurredAt),
      occurredAt: item.occurredAt,
    }));

    return {
      items,
      meta: createPaginationMeta(itemsAll.length, page, limit),
    };
  }

  async getOverview() {
    const totalEmployee = await this.prisma.client.employeeProfile.count();
    const totalEmployer = await this.prisma.client.employerProfile.count();
    const activeJobs = await this.prisma.client.job.count({
      where: { status: JobStatus.open },
    });
    const backgroundChecks = await this.prisma.client.user.count({
      where: { is_verified: true },
    });
    return {
      totalEmployee,
      totalEmployer,
      activeJobs,
      backgroundChecks,
    };
  }

  async getStatistics(period?: 'this_week' | 'this_month' | 'this_year') {
    const now = new Date();

    if (period === 'this_year') {
      return await this.getYearlyStatistics(now);
    } else if (period === 'this_month') {
      return await this.getMonthlyStatistics(now);
    } else if (period === 'this_week') {
      return await this.getWeeklyStatistics(now);
    }

    // If no period specified, return all-time stats
    const [complete_job, open_job, total_user, total_subscription] =
      await Promise.all([
        this.prisma.client.job.count({
          where: { status: JobStatus.completed },
        }),
        this.prisma.client.job.count({ where: { status: JobStatus.open } }),
        this.prisma.client.user.count(),
        this.prisma.client.subscription.count({
          where: { status: SubscriptionStatus.active },
        }),
      ]);

    return {
      complete_job,
      open_job,
      total_user,
      total_subscription,
      period: 'all_time',
    };
  }

  private async getYearlyStatistics(now: Date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const currentYear = now.getFullYear();
    const statistics = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

      const [complete_job, open_job, total_user, total_subscription] =
        await Promise.all([
          this.prisma.client.job.count({
            where: {
              status: JobStatus.completed,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.job.count({
            where: {
              status: JobStatus.open,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.user.count({
            where: { created_at: { gte: startDate, lte: endDate } },
          }),
          this.prisma.client.subscription.count({
            where: {
              status: SubscriptionStatus.active,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
        ]);

      statistics.push({
        month: months[month],
        complete_job,
        open_job,
        total_user,
        total_subscription,
      });
    }

    return {
      data: statistics,
      period: 'this_year',
    };
  }

  private async getMonthlyStatistics(now: Date) {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const statistics = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const startDate = new Date(currentYear, currentMonth, day, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth, day, 23, 59, 59, 999);

      const [complete_job, open_job, total_user, total_subscription] =
        await Promise.all([
          this.prisma.client.job.count({
            where: {
              status: JobStatus.completed,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.job.count({
            where: {
              status: JobStatus.open,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.user.count({
            where: { created_at: { gte: startDate, lte: endDate } },
          }),
          this.prisma.client.subscription.count({
            where: {
              status: SubscriptionStatus.active,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
        ]);

      statistics.push({
        day,
        complete_job,
        open_job,
        total_user,
        total_subscription,
      });
    }

    return {
      data: statistics,
      period: 'this_month',
    };
  }

  private async getWeeklyStatistics(now: Date) {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOfWeek,
    );
    const statistics = [];
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    for (let day = 0; day < 7; day++) {
      const startDate = new Date(startOfWeek);
      startDate.setDate(startOfWeek.getDate() + day);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      const [complete_job, open_job, total_user, total_subscription] =
        await Promise.all([
          this.prisma.client.job.count({
            where: {
              status: JobStatus.completed,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.job.count({
            where: {
              status: JobStatus.open,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.client.user.count({
            where: { created_at: { gte: startDate, lte: endDate } },
          }),
          this.prisma.client.subscription.count({
            where: {
              status: SubscriptionStatus.active,
              created_at: { gte: startDate, lte: endDate },
            },
          }),
        ]);

      statistics.push({
        day: dayNames[day],
        date: startDate.toISOString().split('T')[0],
        complete_job,
        open_job,
        total_user,
        total_subscription,
      });
    }

    return {
      data: statistics,
      period: 'this_week',
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
}
