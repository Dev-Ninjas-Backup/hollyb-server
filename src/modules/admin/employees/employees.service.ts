import { Injectable } from '@nestjs/common';
import {
  BackgroundCheckStatus,
  JobApplicationStatus,
  JobStatus,
  SubscriptionPlanType,
  ShiftStatus,
  UserRole,
} from '@prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { createPaginationMeta } from '@/common/utils/response.helper';
import { AdminEmployeeActivityQueryDto } from './dto';

type EmployeeActivityItem = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  action: string;
  occurredAt: Date;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalEmployees, topRatedEmployees, activeJobs, verifiedEmployees] =
      await Promise.all([
        this.prisma.client.employeeProfile.count(),
        this.prisma.client.employeeProfile.count({
          where: { rating: { gte: 4.5 } },
        }),
        this.prisma.client.jobApplication.count({
          where: {
            status: {
              in: [
                JobApplicationStatus.applied,
                JobApplicationStatus.accepted,
                JobApplicationStatus.confirmed,
              ],
            },
            job: {
              status: {
                in: [JobStatus.open, JobStatus.assigned],
              },
            },
          },
        }),
        this.prisma.client.user.count({
          where: {
            role: UserRole.employee,
            is_verified: true,
            is_deleted: false,
          },
        }),
      ]);

    return {
      totalEmployees,
      verifiedEmployees,
      activeJobs,
      topRatedEmployees,
      topRatedThreshold: 4.5,
    };
  }

  async getGrowthInsights() {
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

      const count = await this.prisma.client.employeeProfile.count({
        where: {
          created_at: {
            gte: start,
            lte: end,
          },
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

  async getEngagementInsights() {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const totalEmployees = await this.prisma.client.employeeProfile.count();
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

      const active = await this.prisma.client.employeeProfile.count({
        where: {
          user: {
            last_active_at: {
              gte: dayStart,
              lte: dayEnd,
            },
            is_deleted: false,
          },
        },
      });

      items.push({
        day: dayStart.toLocaleString('en-US', { weekday: 'short' }),
        date: dayStart.toISOString().split('T')[0],
        active,
        inactive: Math.max(totalEmployees - active, 0),
      });
    }

    return {
      period: 'last_7_days',
      items,
    };
  }

  async getRecentActivities(query: AdminEmployeeActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sourceTake = Math.max(limit * page, 30);

    const [
      profileUpdates,
      backgroundCheckPasses,
      reviewReceipts,
      completedJobs,
      employeeRegistrations,
      employeeSubscriptions,
      jobApplications,
    ] = await Promise.all([
      this.prisma.client.employeeProfile.findMany({
        orderBy: { updated_at: 'desc' },
        take: sourceTake,
        select: {
          user_id: true,
          updated_at: true,
          profile_photo_url: true,
          user: {
            select: {
              full_name: true,
            },
          },
        },
      }),
      this.prisma.client.backgroundCheck.findMany({
        where: {
          status: BackgroundCheckStatus.passed,
          user: { role: UserRole.employee },
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
              employee_profile: {
                select: {
                  profile_photo_url: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.client.review.findMany({
        orderBy: { created_at: 'desc' },
        take: sourceTake,
        select: {
          created_at: true,
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
      this.prisma.client.subscription.findMany({
        where: {
          plan_type: SubscriptionPlanType.employee_premium,
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
              employee_profile: {
                select: {
                  profile_photo_url: true,
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
          applied_at: true,
        },
      }),
    ]);

    const allActivities: EmployeeActivityItem[] = [
      ...profileUpdates.map((row) => ({
        userId: row.user_id,
        name: row.user.full_name,
        avatarUrl: row.profile_photo_url,
        action: 'Updated profile information',
        occurredAt: row.updated_at,
      })),
      ...backgroundCheckPasses.map((row) => ({
        userId: row.user_id,
        name: row.user.full_name,
        avatarUrl: row.user.employee_profile?.profile_photo_url ?? null,
        action: 'Background check verified',
        occurredAt: row.checked_at ?? row.created_at,
      })),
      ...reviewReceipts.map((row) => ({
        userId: row.employee.user_id,
        name: row.employee.user.full_name,
        avatarUrl: row.employee.profile_photo_url,
        action: 'Received a new rating',
        occurredAt: row.created_at,
      })),
      ...completedJobs.map((row) => ({
        userId: row.employee.user_id,
        name: row.employee.user.full_name,
        avatarUrl: row.employee.profile_photo_url,
        action: `Completed job \"${row.job.title}\"`,
        occurredAt: row.checked_out_at ?? row.updated_at,
      })),
      ...employeeRegistrations.map((row) => ({
        userId: row.id,
        name: row.full_name,
        avatarUrl: row.employee_profile?.profile_photo_url ?? null,
        action: 'Employee registration completed',
        occurredAt: row.created_at,
      })),
      ...employeeSubscriptions.map((row) => ({
        userId: row.user_id,
        name: row.user.full_name,
        avatarUrl: row.user.employee_profile?.profile_photo_url ?? null,
        action: `Subscription started (USD ${String(row.amount)})`,
        occurredAt: row.created_at,
      })),
      ...jobApplications.map((row) => ({
        userId: row.employee.user_id,
        name: row.employee.user.full_name,
        avatarUrl: row.employee.profile_photo_url,
        action: `Applied to job \"${row.job.title}\"`,
        occurredAt: row.applied_at,
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
