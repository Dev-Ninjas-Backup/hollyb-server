import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';
import { BusinessException } from '@/common/exceptions/business.exception';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  private formatTime12h(time: Date | null | undefined): string | null {
    if (!time) {
      return null;
    }

    const hours24 = time.getUTCHours();
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    const hour12 = hours24 % 12 || 12;
    const suffix = hours24 >= 12 ? 'PM' : 'AM';

    return `${String(hour12).padStart(2, '0')}:${minutes} ${suffix}`;
  }

  private getOpenAndNotExpiredWhere(
    search?: string,
    jobCategory?: GetJobsQueryDto['job_category'],
  ): Prisma.JobWhereInput {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return {
      AND: [
        { status: 'open' },
        {
          OR: [{ expire_date: null }, { expire_date: { gte: today } }],
        },
        ...(jobCategory ? [{ job_category: jobCategory }] : []),
        ...(search
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    company_name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    description: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    requirements: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };
  }

  async getLatestJobs(
    userId: string,
    query: Pick<GetJobsQueryDto, 'search' | 'job_category'>,
  ) {
    const where = this.getOpenAndNotExpiredWhere(
      query.search,
      query.job_category,
    );

    const employeeProfile = await this.prisma.client.employeeProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    const [jobs, availableJobs, appliedJobs] =
      await this.prisma.client.$transaction([
        this.prisma.client.job.findMany({
          where,
          select: {
            id: true,
            title: true,
            company_name: true,
            description: true,
            requirements: true,
            job_category: true,
            is_urgent: true,
            job_date: true,
            start_time: true,
            end_time: true,
            amount: true,
            totalAmount: true,
            location: true,
            created_at: true,
            file: {
              select: {
                url: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 5,
        }),
        this.prisma.client.job.count({ where }),
        this.prisma.client.jobApplication.count({
          where: employeeProfile
            ? {
                employee_id: employeeProfile.id,
              }
            : {
                id: '__no_application__',
              },
        }),
      ]);

    return {
      success: true,
      message: 'Latest jobs retrieved successfully',
      data: jobs.map((job) => ({
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      })),
      stats: {
        availableJobs,
        appliedJobs,
      },
    };
  }

  async getJobs(query: GetJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.getOpenAndNotExpiredWhere(
      query.search,
      query.job_category,
    );

    const [jobs, totalJobs] = await this.prisma.client.$transaction([
      this.prisma.client.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          company_name: true,
          description: true,
          requirements: true,
          job_category: true,
          is_urgent: true,
          job_date: true,
          start_time: true,
          end_time: true,
          amount: true,
          totalAmount: true,
          location: true,
          created_at: true,
          file: {
            select: {
              url: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.client.job.count({ where }),
    ]);

    return {
      success: true,
      message: 'Jobs retrieved successfully',
      data: jobs.map((job) => ({
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      })),
      meta: {
        page,
        limit,
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
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
            profile_photo_url: true,
            rating: true,
          },
        },
        file: {
          select: {
            id: true,
            url: true,
            filename: true,
            originalFilename: true,
            mimeType: true,
            fileType: true,
          },
        },
      },
    });

    if (!job) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Job details retrieved successfully',
      data: {
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      },
    };
  }

  async getJobStats(employeeId: string) {
    // Check if employee exists
    const employee = await this.prisma.client.employeeProfile.findUnique({
      where: { user_id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw new BusinessException('Employee not found', HttpStatus.NOT_FOUND);
    }

    // Get completed jobs count
    const completedJobsCount = await this.prisma.client.jobShift.count({
      where: {
        employee_id: employeeId,
        status: 'completed',
      },
    });

    // Get total work hours from completed shifts
    const shiftsAggregate = await this.prisma.client.jobShift.aggregate({
      where: {
        employee_id: employeeId,
        status: 'completed',
      },
      _sum: {
        total_worked_seconds: true,
      },
    });

    const totalWorkedSeconds = shiftsAggregate._sum.total_worked_seconds ?? 0;
    const totalWorkHours = Number((totalWorkedSeconds / 3600).toFixed(2));

    // Get total earned money
    const earningsAggregate = await this.prisma.client.earning.aggregate({
      where: {
        employee_id: employeeId,
      },
      _sum: {
        net_amount: true,
      },
    });

    const totalEarned = earningsAggregate._sum.net_amount ?? 0;

    return {
      success: true,
      message: 'Employee stats retrieved successfully',
      data: {
        completedJobsCount,
        totalWorkHours,
        totalEarned: Number(totalEarned),
      },
    };
  }
}
