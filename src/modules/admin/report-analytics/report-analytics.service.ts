import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  JobApplicationStatus,
  JobStatus,
  PaymentStatus,
  ShiftStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ReportAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalJobs,
      totalRevenue,
      currentMonthUsers,
      previousMonthUsers,
      currentMonthJobs,
      previousMonthJobs,
      currentMonthRevenue,
      previousMonthRevenue,
    ] = await Promise.all([
      this.prisma.client.user.count({
        where: {
          is_deleted: false,
          role: {
            in: [UserRole.employee, UserRole.employer],
          },
        },
      }),
      this.prisma.client.job.count(),
      this.getTotalRevenue(),
      this.getCurrentMonthUserCount(),
      this.getPreviousMonthUserCount(),
      this.getCurrentMonthJobCount(),
      this.getPreviousMonthJobCount(),
      this.getCurrentMonthRevenue(),
      this.getPreviousMonthRevenue(),
    ]);

    const totalUsersTrend = this.toTrendMetric(
      currentMonthUsers,
      previousMonthUsers,
    );
    const totalJobsTrend = this.toTrendMetric(
      currentMonthJobs,
      previousMonthJobs,
    );
    const totalRevenueTrend = this.toTrendMetric(
      currentMonthRevenue,
      previousMonthRevenue,
    );
    const growthRateSigned = Number(
      (
        (this.toSignedTrendValue(currentMonthUsers, previousMonthUsers) +
          this.toSignedTrendValue(currentMonthJobs, previousMonthJobs) +
          this.toSignedTrendValue(currentMonthRevenue, previousMonthRevenue)) /
        3
      ).toFixed(2),
    );

    return {
      totalUsers,
      totalJobs,
      totalRevenue,
      growthRate: growthRateSigned,
      trend: {
        totalUsers: totalUsersTrend,
        totalJobs: totalJobsTrend,
        totalRevenue: totalRevenueTrend,
        growthRate: this.toTrendMetricFromSigned(growthRateSigned),
      },
    };
  }

  async getJobsPostedVsCompleted() {
    const { startDate, endDate } = this.getLast7DaysRange();

    const [postedJobs, completedJobs] = await Promise.all([
      this.prisma.client.job.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { created_at: true },
      }),
      this.prisma.client.job.findMany({
        where: {
          status: JobStatus.completed,
          updated_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { updated_at: true },
      }),
    ]);

    const days = this.createLast7DaysBuckets(startDate, endDate);
    const dayIndexMap = new Map(days.map((day, index) => [day.dateKey, index]));

    for (const job of postedJobs) {
      const dateKey = this.toDateKey(job.created_at);
      const index = dayIndexMap.get(dateKey);
      if (index !== undefined) {
        days[index].jobsPosted += 1;
      }
    }

    for (const job of completedJobs) {
      const dateKey = this.toDateKey(job.updated_at);
      const index = dayIndexMap.get(dateKey);
      if (index !== undefined) {
        days[index].jobsCompleted += 1;
      }
    }

    return {
      period: 'weekly',
      items: days.map((day) => ({
        label: day.label,
        jobsPosted: day.jobsPosted,
        jobsCompleted: day.jobsCompleted,
      })),
    };
  }

  async getSubscriptionOverview() {
    const now = new Date();
    const [active, expired] = await Promise.all([
      this.prisma.client.subscription.count({
        where: {
          status: SubscriptionStatus.active,
          end_date: { gte: now },
        },
      }),
      this.prisma.client.subscription.count({
        where: {
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

  async getTopPerformingEmployers() {
    const employers = await this.prisma.client.employerProfile.findMany({
      where: {
        jobs: {
          some: {},
        },
      },
      select: {
        id: true,
        company_name: true,
        jobs: {
          select: {
            status: true,
          },
        },
        user: {
          select: {
            full_name: true,
          },
        },
      },
    });

    const ranked = employers
      .map((employer) => {
        const totalJobs = employer.jobs.length;
        const completedJobs = employer.jobs.filter(
          (job) => job.status === JobStatus.completed,
        ).length;
        const completionRate =
          totalJobs === 0
            ? 0
            : Number(((completedJobs / totalJobs) * 100).toFixed(2));
        const score = totalJobs + completionRate;

        return {
          id: employer.id,
          name: employer.company_name ?? employer.user.full_name,
          totalJobs,
          completedJobs,
          completionRate,
          score,
        };
      })
      .filter((item) => item.totalJobs > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (b.totalJobs !== a.totalJobs) {
          return b.totalJobs - a.totalJobs;
        }

        return b.completedJobs - a.completedJobs;
      })
      .slice(0, 3);

    return ranked.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      name: item.name,
      totalJobs: item.totalJobs,
      completedJobs: item.completedJobs,
      completionRate: item.completionRate,
    }));
  }
  private async getMonthlyGrowthRateFromTotals() {
    const [totalUsers, totalUsersAtPreviousMonthEnd] = await Promise.all([
      this.prisma.client.user.count({
        where: {
          is_deleted: false,
          role: {
            in: [UserRole.employee, UserRole.employer],
          },
        },
      }),
      this.getTotalUsersAtPreviousMonthEnd(),
    ]);

    return this.toPercentChange(totalUsers, totalUsersAtPreviousMonthEnd);
  }

  private async getTotalUsersAtPreviousMonthEnd() {
    const { endPreviousMonth } = this.getPreviousMonthRange();
    return this.prisma.client.user.count({
      where: {
        is_deleted: false,
        role: {
          in: [UserRole.employee, UserRole.employer],
        },
        created_at: {
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getTotalJobsAtPreviousMonthEnd() {
    const { endPreviousMonth } = this.getPreviousMonthRange();
    return this.prisma.client.job.count({
      where: {
        created_at: {
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getTotalRevenueAtPreviousMonthEnd() {
    const { endPreviousMonth } = this.getPreviousMonthRange();
    const result = await this.prisma.client.payment.aggregate({
      where: {
        status: PaymentStatus.success,
        created_at: {
          lte: endPreviousMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  async getTopPerformingEmployees() {
    const employees = await this.prisma.client.employeeProfile.findMany({
      select: {
        id: true,
        total_jobs: true,
        user: {
          select: {
            full_name: true,
          },
        },
        job_applications: {
          select: {
            status: true,
            job: {
              select: {
                status: true,
              },
            },
          },
        },
        shifts: {
          where: {
            status: ShiftStatus.completed,
          },
          select: {
            id: true,
          },
        },
      },
    });

    const ranked = employees
      .map((employee) => {
        const assignedApplications = employee.job_applications.filter(
          (application) =>
            application.status === JobApplicationStatus.accepted ||
            application.status === JobApplicationStatus.confirmed,
        );
        const totalJobs =
          assignedApplications.length ||
          employee.total_jobs ||
          employee.shifts.length;
        const completedFromApplications = assignedApplications.filter(
          (application) => application.job.status === JobStatus.completed,
        ).length;
        const completedJobs = Math.max(
          completedFromApplications,
          employee.shifts.length,
        );
        const completionRate =
          totalJobs === 0
            ? 0
            : Number(((completedJobs / totalJobs) * 100).toFixed(2));
        const score = totalJobs + completionRate;

        return {
          id: employee.id,
          name: employee.user.full_name,
          totalJobs,
          completedJobs,
          completionRate,
          score,
        };
      })
      .filter((item) => item.totalJobs > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (b.totalJobs !== a.totalJobs) {
          return b.totalJobs - a.totalJobs;
        }

        return b.completedJobs - a.completedJobs;
      })
      .slice(0, 3);

    return ranked.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      name: item.name,
      totalJobs: item.totalJobs,
      completedJobs: item.completedJobs,
      completionRate: item.completionRate,
    }));
  }

  async getTopSellers() {
    const [
      employerEngagement,
      employeeRetention,
      jobCompletionRate,
      subscriptionGrowth,
    ] = await Promise.all([
      this.getEmployerEngagementMetrics(),
      this.getEmployeeRetentionMetrics(),
      this.getJobCompletionMetrics(),
      this.getSubscriptionGrowthMetrics(),
    ]);

    return [
      {
        reportType: 'Employer Engagement',
        description: 'Percentage of employers posting jobs this month',
        currentValue: `${employerEngagement.currentValue.toFixed(2)}%`,
        trend: this.toTrendMetric(
          employerEngagement.currentValue,
          employerEngagement.previousValue,
        ),
        lastUpdated: new Date(),
      },
      {
        reportType: 'Employee Retention',
        description: 'Percentage of active employees in last 30 days',
        currentValue: `${employeeRetention.currentValue.toFixed(2)}%`,
        trend: this.toTrendMetric(
          employeeRetention.currentValue,
          employeeRetention.previousValue,
        ),
        lastUpdated: new Date(),
      },
      {
        reportType: 'Job Completion Rate',
        description: 'Percentage of completed jobs',
        currentValue: `${jobCompletionRate.currentValue.toFixed(2)}%`,
        trend: this.toTrendMetric(
          jobCompletionRate.currentValue,
          jobCompletionRate.previousValue,
        ),
        lastUpdated: new Date(),
      },
      {
        reportType: 'Subscription Growth',
        description: 'Monthly subscription growth rate',
        currentValue: `${subscriptionGrowth.currentValue.toFixed(2)}%`,
        trend: this.toTrendMetric(
          subscriptionGrowth.currentValue,
          subscriptionGrowth.previousValue,
        ),
        lastUpdated: new Date(),
      },
    ];
  }

  private async getTotalRevenue() {
    const result = await this.prisma.client.payment.aggregate({
      where: {
        status: PaymentStatus.success,
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  private async getCurrentMonthRevenue() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    const result = await this.prisma.client.payment.aggregate({
      where: {
        status: PaymentStatus.success,
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  private async getPreviousMonthRevenue() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    const result = await this.prisma.client.payment.aggregate({
      where: {
        status: PaymentStatus.success,
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  private async getCurrentMonthUserCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.user.count({
      where: {
        is_deleted: false,
        role: {
          in: [UserRole.employee, UserRole.employer],
        },
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    });
  }

  private async getPreviousMonthUserCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.user.count({
      where: {
        is_deleted: false,
        role: {
          in: [UserRole.employee, UserRole.employer],
        },
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getCurrentMonthJobCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.job.count({
      where: {
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    });
  }

  private async getPreviousMonthJobCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.job.count({
      where: {
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getMonthlyUserGrowthRate() {
    const [currentMonthUsers, previousMonthUsers] = await Promise.all([
      this.getCurrentMonthUserCount(),
      this.getPreviousMonthUserCount(),
    ]);

    return this.toPercentChange(currentMonthUsers, previousMonthUsers);
  }

  private async getPreviousMonthlyUserGrowthRate() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    const startTwoMonthsAgo = new Date(
      startPreviousMonth.getFullYear(),
      startPreviousMonth.getMonth() - 1,
      1,
    );
    const endTwoMonthsAgo = new Date(startPreviousMonth.getTime() - 1);

    const [previousMonthUsers, twoMonthsAgoUsers] = await Promise.all([
      this.prisma.client.user.count({
        where: {
          is_deleted: false,
          role: {
            in: [UserRole.employee, UserRole.employer],
          },
          created_at: {
            gte: startPreviousMonth,
            lte: endPreviousMonth,
          },
        },
      }),
      this.prisma.client.user.count({
        where: {
          is_deleted: false,
          role: {
            in: [UserRole.employee, UserRole.employer],
          },
          created_at: {
            gte: startTwoMonthsAgo,
            lte: endTwoMonthsAgo,
          },
        },
      }),
    ]);

    return this.toPercentChange(previousMonthUsers, twoMonthsAgoUsers);
  }

  private async getEmployerEngagementMetrics() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();

    const [totalEmployers, currentActiveEmployers, previousActiveEmployers] =
      await Promise.all([
        this.prisma.client.employerProfile.count(),
        this.prisma.client.employerProfile.count({
          where: {
            jobs: {
              some: {
                created_at: {
                  gte: startCurrentMonth,
                  lte: endCurrentMonth,
                },
              },
            },
          },
        }),
        this.prisma.client.employerProfile.count({
          where: {
            jobs: {
              some: {
                created_at: {
                  gte: startPreviousMonth,
                  lte: endPreviousMonth,
                },
              },
            },
          },
        }),
      ]);

    return {
      currentValue:
        totalEmployers === 0
          ? 0
          : (currentActiveEmployers / totalEmployers) * 100,
      previousValue:
        totalEmployers === 0
          ? 0
          : (previousActiveEmployers / totalEmployers) * 100,
    };
  }

  private async getEmployeeRetentionMetrics() {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 30);
    const previousWindowEnd = new Date(currentStart.getTime() - 1);
    const previousWindowStart = new Date(previousWindowEnd);
    previousWindowStart.setDate(previousWindowEnd.getDate() - 30);

    const [totalEmployees, currentActiveEmployees, previousActiveEmployees] =
      await Promise.all([
        this.prisma.client.employeeProfile.count(),
        this.prisma.client.employeeProfile.count({
          where: {
            user: {
              last_active_at: {
                gte: currentStart,
                lte: now,
              },
            },
          },
        }),
        this.prisma.client.employeeProfile.count({
          where: {
            user: {
              last_active_at: {
                gte: previousWindowStart,
                lte: previousWindowEnd,
              },
            },
          },
        }),
      ]);

    return {
      currentValue:
        totalEmployees === 0
          ? 0
          : (currentActiveEmployees / totalEmployees) * 100,
      previousValue:
        totalEmployees === 0
          ? 0
          : (previousActiveEmployees / totalEmployees) * 100,
    };
  }

  private async getJobCompletionMetrics() {
    const [totalJobs, completedJobs, previousTotalJobs, previousCompletedJobs] =
      await Promise.all([
        this.prisma.client.job.count(),
        this.prisma.client.job.count({
          where: { status: JobStatus.completed },
        }),
        this.getPreviousMonthJobCount(),
        this.getPreviousMonthCompletedJobCount(),
      ]);

    return {
      currentValue: totalJobs === 0 ? 0 : (completedJobs / totalJobs) * 100,
      previousValue:
        previousTotalJobs === 0
          ? 0
          : (previousCompletedJobs / previousTotalJobs) * 100,
    };
  }

  private async getSubscriptionGrowthMetrics() {
    const [currentMonthSubscriptions, previousMonthSubscriptions] =
      await Promise.all([
        this.getCurrentMonthSubscriptionCount(),
        this.getPreviousMonthSubscriptionCount(),
      ]);

    const previousValue = await this.getPreviousSubscriptionGrowthRate();
    const currentValue = this.toPercentChange(
      currentMonthSubscriptions,
      previousMonthSubscriptions,
    );

    return {
      currentValue,
      previousValue,
    };
  }

  private async getCurrentMonthSubscriptionCount() {
    const { startCurrentMonth, endCurrentMonth } = this.getCurrentMonthRange();
    return this.prisma.client.subscription.count({
      where: {
        created_at: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    });
  }

  private async getPreviousMonthSubscriptionCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.subscription.count({
      where: {
        created_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }

  private async getPreviousSubscriptionGrowthRate() {
    const { startPreviousMonth } = this.getPreviousMonthRange();
    const startTwoMonthsAgo = new Date(
      startPreviousMonth.getFullYear(),
      startPreviousMonth.getMonth() - 1,
      1,
    );
    const endTwoMonthsAgo = new Date(startPreviousMonth.getTime() - 1);

    const [previousMonthSubscriptions, twoMonthsAgoSubscriptions] =
      await Promise.all([
        this.getPreviousMonthSubscriptionCount(),
        this.prisma.client.subscription.count({
          where: {
            created_at: {
              gte: startTwoMonthsAgo,
              lte: endTwoMonthsAgo,
            },
          },
        }),
      ]);

    return this.toPercentChange(
      previousMonthSubscriptions,
      twoMonthsAgoSubscriptions,
    );
  }

  private async getPreviousMonthCompletedJobCount() {
    const { startPreviousMonth, endPreviousMonth } =
      this.getPreviousMonthRange();
    return this.prisma.client.job.count({
      where: {
        status: JobStatus.completed,
        updated_at: {
          gte: startPreviousMonth,
          lte: endPreviousMonth,
        },
      },
    });
  }

  private getLast7DaysRange() {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    return {
      startDate,
      endDate,
    };
  }

  private createLast7DaysBuckets(startDate: Date, endDate: Date) {
    const days: Array<{
      label: string;
      dateKey: string;
      jobsPosted: number;
      jobsCompleted: number;
    }> = [];

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      days.push({
        label: cursor.toLocaleString('en-US', { weekday: 'short' }),
        dateKey: this.toDateKey(cursor),
        jobsPosted: 0,
        jobsCompleted: 0,
      });

      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    }

    return days;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toPercentChange(current: number, previous: number) {
    if (current === previous) {
      return 0;
    }

    if (current > previous) {
      if (current === 0) {
        return 0;
      }

      return Number((((current - previous) / current) * 100).toFixed(2));
    }

    if (previous === 0) {
      return 100;
    }

    return Number((((previous - current) / previous) * 100).toFixed(2));
  }

  private toTrendMetric(current: number, previous: number) {
    const value = this.toPercentChange(current, previous);
    const sign =
      current > previous ? 'up' : current < previous ? 'down' : 'flat';

    return {
      value,
      isPositive: sign === 'up',
      sign,
    };
  }

  private toSignedTrendValue(current: number, previous: number) {
    const value = this.toPercentChange(current, previous);

    if (current > previous) {
      return value;
    }

    if (current < previous) {
      return -value;
    }

    return 0;
  }

  private toTrendMetricFromSigned(value: number) {
    const absValue = Number(Math.abs(value).toFixed(2));
    const sign = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';

    return {
      value: absValue,
      isPositive: sign === 'up',
      sign,
    };
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
}
