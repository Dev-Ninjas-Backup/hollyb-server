import { Injectable } from '@nestjs/common';
import { BackgroundCheckStatus, SubscriptionStatus, UserRole } from '@prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { createPaginationMeta } from '@/common/utils/response.helper';
import { ResourceNotFoundException } from '@/common/exceptions/business.exception';
import {
  AdminBackgroundCheckDateRangePreset,
  AdminBackgroundCheckQueryDto,
  AdminBackgroundCheckStatusFilter,
  AdminBackgroundCheckUserType,
} from './dto/admin-background-check-query.dto';

@Injectable()
export class BackgroundCheckService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const baseWhere = {
      is_deleted: false,
      role: {
        in: [UserRole.employer, UserRole.employee],
      },
    };

    const [totalChecks, verified, unVerified] = await Promise.all([
      this.prisma.client.user.count({ where: baseWhere }),
      this.prisma.client.user.count({
        where: {
          ...baseWhere,
          is_verified: true,
        },
      }),
      this.prisma.client.user.count({
        where: {
          ...baseWhere,
          is_verified: false,
        },
      }),
    ]);

    return {
      totalChecks,
      verified,
      unVerified,
    };
  }

  async getBackgroundChecks(query: AdminBackgroundCheckQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildUserWhere(query, true);

    const [rows, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          role: true,
          is_verified: true,
          account_status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          updated_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.client.user.count({ where }),
    ]);

    const items = rows.map((row) => {
      const status = this.resolveVerificationStatus(row.is_verified);

      return {
        id: row.id,
        name: row.full_name,
        userType: row.role,
        verificationStatus: status,
        dateChecked: row.created_at,
      };
    });

    return {
      items,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getRecentActivities(query: AdminBackgroundCheckQueryDto) {
    const where = this.buildUserWhere(query, true);

    const rows = await this.prisma.client.user.findMany({
      where,
      select: {
        id: true,
        full_name: true,
        role: true,
        is_verified: true,
        account_status: true,
        updated_at: true,
        background_checks: {
          orderBy: [{ checked_at: 'desc' }, { created_at: 'desc' }],
          take: 1,
          select: {
            checked_at: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 10,
    });

    return rows.map((row) => {
      const status = this.resolveVerificationStatus(row.is_verified);
      const latestCheck = row.background_checks[0];
      const occurredAt =
        latestCheck?.checked_at ?? latestCheck?.created_at ?? row.updated_at;

      return {
        userName: row.full_name,
        userType: row.role,
        action: this.toActivityAction(status),
        relativeTime: this.toRelativeTime(occurredAt),
        occurredAt,
      };
    });
  }

  async getBackgroundCheckDetail(id: string) {
    const row = await this.prisma.client.user.findFirst({
      where: {
        id,
        is_deleted: false,
        role: {
          in: [UserRole.employer, UserRole.employee],
        },
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        phone: true,
        is_verified: true,
        account_status: true,
        created_at: true,
        last_active_at: true,
        background_checks: {
          orderBy: [{ checked_at: 'desc' }, { created_at: 'desc' }],
          take: 10,
          select: {
            id: true,
            status: true,
            checked_at: true,
            created_at: true,
            notes: true,
          },
        },
        documents: {
          orderBy: { uploaded_at: 'desc' },
          select: {
            id: true,
            type: true,
            file_url: true,
            status: true,
            rejection_reason: true,
            uploaded_at: true,
            reviewed_at: true,
          },
        },
        employee_profile: {
          select: {
            id: true,
            date_of_birth: true,
            address: true,
            experience_years: true,
            bio: true,
            profile_photo_url: true,
            rating: true,
            total_reviews: true,
            total_jobs: true,
            total_hours: true,
            total_earned: true,
          },
        },
        employer_profile: {
          select: {
            id: true,
            company_name: true,
            address: true,
            profile_photo_url: true,
            rating: true,
            total_reviews: true,
            total_hires: true,
          },
        },
        subscriptions: {
          where: {
            status: SubscriptionStatus.active,
            end_date: {
              gte: new Date(),
            },
          },
          orderBy: {
            end_date: 'desc',
          },
          take: 1,
          select: {
            id: true,
            plan_type: true,
            amount: true,
            start_date: true,
            end_date: true,
            status: true,
          },
        },
      },
    });

    if (!row) {
      throw new ResourceNotFoundException('User', id);
    }

    const verificationStatus = this.resolveVerificationStatus(row.is_verified);
    const activeSubscription = row.subscriptions[0];

    const detail: any = {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      userType: row.role,
      accountStatus: row.account_status,
      isVerified: row.is_verified,
      verificationStatus,
      dateChecked: row.created_at,
      joinedAt: row.created_at,
      lastActiveAt: row.last_active_at,
      documents: row.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        fileUrl: doc.file_url,
        status: doc.status,
        rejectionReason: doc.rejection_reason,
        uploadedAt: doc.uploaded_at,
        reviewedAt: doc.reviewed_at,
      })),
    };

    if (row.role === UserRole.employee && row.employee_profile) {
      detail.profile = {
        id: row.employee_profile.id,
        dateOfBirth:
          row.employee_profile.date_of_birth?.toISOString().split('T')[0] ??
          null,
        address: row.employee_profile.address,
        experienceYears: row.employee_profile.experience_years,
        bio: row.employee_profile.bio,
        profilePhotoUrl: row.employee_profile.profile_photo_url,
        rating: row.employee_profile.rating,
        totalReviews: row.employee_profile.total_reviews,
        totalJobs: row.employee_profile.total_jobs,
        totalHours: row.employee_profile.total_hours,
        totalEarned: String(row.employee_profile.total_earned),
      };
    }

    if (row.role === UserRole.employer && row.employer_profile) {
      detail.profile = {
        id: row.employer_profile.id,
        companyName: row.employer_profile.company_name,
        address: row.employer_profile.address,
        profilePhotoUrl: row.employer_profile.profile_photo_url,
        rating: row.employer_profile.rating,
        totalReviews: row.employer_profile.total_reviews,
        totalHires: row.employer_profile.total_hires,
      };
    }

    if (activeSubscription) {
      detail.activeSubscription = {
        id: activeSubscription.id,
        planType: activeSubscription.plan_type,
        amount: String(activeSubscription.amount),
        startDate: activeSubscription.start_date.toISOString().split('T')[0],
        endDate: activeSubscription.end_date.toISOString().split('T')[0],
        status: activeSubscription.status,
      };
    }

    return detail;
  }

  private buildUserWhere(
    query: AdminBackgroundCheckQueryDto,
    includeStatus: boolean,
  ) {
    const { from, to } = this.resolveDateRange(query);

    const where: any = {
      is_deleted: false,
      role:
        query.userType === AdminBackgroundCheckUserType.employers
          ? UserRole.employer
          : query.userType === AdminBackgroundCheckUserType.employees
            ? UserRole.employee
            : { in: [UserRole.employer, UserRole.employee] },
      ...(from && to
        ? {
            created_at: {
              gte: from,
              lte: to,
            },
          }
        : {}),
    };

    if (
      !includeStatus ||
      !query.status ||
      query.status === AdminBackgroundCheckStatusFilter.all
    ) {
      return where;
    }

    if (query.status === AdminBackgroundCheckStatusFilter.verified) {
      where.is_verified = true;
      return where;
    }

    where.is_verified = false;
    return where;
  }

  private resolveDateRange(query: AdminBackgroundCheckQueryDto) {
    const now = new Date();

    if (query.dateRange === AdminBackgroundCheckDateRangePreset.all_time) {
      return { from: null, to: null };
    }

    if (query.dateRange === AdminBackgroundCheckDateRangePreset.last_month) {
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
      query.dateRange === AdminBackgroundCheckDateRangePreset.custom &&
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

  private resolveVerificationStatus(
    isVerified: boolean,
  ): 'verified' | 'unverified' {
    if (isVerified) {
      return 'verified';
    }

    return 'unverified';
  }

  private mapBackgroundStatus(
    status: BackgroundCheckStatus,
  ): 'verified' | 'unverified' {
    if (status === BackgroundCheckStatus.passed) {
      return 'verified';
    }

    return 'unverified';
  }

  private toActivityAction(status: 'verified' | 'unverified') {
    if (status === 'verified') {
      return 'Verified Automatically';
    }

    return 'UnVerified';
  }

  private toRelativeTime(date: Date) {
    const diffMs = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) {
      return 'just now';
    }

    if (minutes < 60) {
      return `${minutes} mins ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hrs ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }
}
