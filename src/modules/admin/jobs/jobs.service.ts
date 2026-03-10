import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const totalJobs = await this.prisma.client.job.count();
    const activeJobs = await this.prisma.client.job.count({
      where: { status: JobStatus.open },
    });
    const inactiveJobs = await this.prisma.client.job.count({
      where: { status: { in: [JobStatus.cancelled, JobStatus.completed] } },
    });

    return {
      totalJobs,
      activeJobs,
      inactiveJobs,
    };
  }

  async getAllJobs(query: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    timeFilter?: 'today' | 'yesterday' | 'this_week' | 'this_month';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {};

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Time filter
    if (query.timeFilter) {
      const now = new Date();
      let startDate: Date;

      switch (query.timeFilter) {
        case 'today':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          where.created_at = { gte: startDate };
          break;
        case 'yesterday':
          const yesterday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1,
          );
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          where.created_at = { gte: yesterday, lt: today };
          break;
        case 'this_week':
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - dayOfWeek,
          );
          where.created_at = { gte: startOfWeek };
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          where.created_at = { gte: startDate };
          break;
      }
    }

    const [jobs, total] = await Promise.all([
      this.prisma.client.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          employer: {
            select: {
              id: true,
              company_name: true,
              user: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                },
              },
            },
          },
          assigned_employee: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                },
              },
            },
          },
          job_applications: {
            select: {
              id: true,
              status: true,
            },
          },
          file: true,
        },
      }),
      this.prisma.client.job.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAllRecentJobs(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {};

    const [jobs, total] = await Promise.all([
      this.prisma.client.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true,
        },
      }),
      this.prisma.client.job.count({ where }),
    ]);

    // Calculate time difference for each job
    const now = new Date();
    const jobsWithTimeDiff = jobs.map((job) => {
      const diffMs = now.getTime() - job.updated_at.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let timeDifference: string;
      if (diffMinutes < 1) {
        timeDifference = 'Just now';
      } else if (diffMinutes < 60) {
        timeDifference = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        timeDifference = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 30) {
        timeDifference = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        timeDifference = `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
      }

      return {
        jobId: job.id,
        jobTitle: job.title,
        status: job.status,
        timeDifference,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: jobsWithTimeDiff,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getJobById(id: string) {
    const job = await this.prisma.client.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            company_name: true,
            address: true,
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
                is_verified: true,
                last_active_at: true,
                created_at: true,
              },
            },
            _count: {
              select: {
                jobs: true,
              }
            },
            jobs: {
              select: {
                id: true,
                title: true,
                status: true,
                created_at: true,
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 3
            }
          },
        },
        assigned_employee: {
          select: {
            id: true,
            address: true,
            experience_years: true,
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
              },
            },
            assigned_job: true,
            date_of_birth: true,
            created_at: true,
            employee_skills: {
              include: {
                skill: true,
              },
            },
            _count: {
              select: {
                assigned_job: {
                  where: {
                    status: JobStatus.completed,
                  }
                },
                received_reviews: true,
              }
            },
            rating: true,
          },
        },
        job_applications: {
          include: {
            employee: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: {
            applied_at: 'desc',
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            status: true,
            type: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        file: true,
      },

    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }
}
