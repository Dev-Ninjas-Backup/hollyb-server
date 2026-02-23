import { HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionPlanType, JobStatus, JobApplicationStatus } from '@prisma';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { GetAppliedJobsQueryDto } from './dto/get-applied-jobs-query.dto';

@Injectable()
export class EmployeeJobsApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async applyToJob(userId: string, jobId: string, dto: ApplyJobDto) {
    const employeeProfile = await this.prisma.client.employeeProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    if (!employeeProfile) {
      throw new BusinessException(
        'Employee profile not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const hasActiveSubscription =
      await this.subscriptionService.checkActiveSubscription(
        userId,
        SubscriptionPlanType.employee_premium,
      );

    if (!hasActiveSubscription) {
      throw new BusinessException(
        'Active subscription required. Please subscribe before applying to jobs.',
        HttpStatus.FORBIDDEN,
      );
    }

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        assigned_employee_id: true,
      },
    });

    if (!job) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    if (job.status !== JobStatus.open) {
      throw new BusinessException(
        'This job is no longer open for applications.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (job.assigned_employee_id) {
      throw new BusinessException(
        'This job is already assigned to another employee.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingApplication =
      await this.prisma.client.jobApplication.findFirst({
        where: {
          job_id: jobId,
          employee_id: employeeProfile.id,
        },
        select: {
          id: true,
        },
      });

    if (existingApplication) {
      throw new BusinessException(
        'You have already applied to this job.',
        HttpStatus.CONFLICT,
      );
    }

    const application = await this.prisma.client.jobApplication.create({
      data: {
        job_id: jobId,
        employee_id: employeeProfile.id,
        cover_note: dto.cover_note,
        status: JobApplicationStatus.applied,
      },
      select: {
        id: true,
        job_id: true,
        employee_id: true,
        cover_note: true,
        status: true,
        applied_at: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: 'Job application submitted successfully',
      data: application,
    };
  }

  async getAppliedJobs(userId: string, query: GetAppliedJobsQueryDto) {
    const employeeProfile = await this.prisma.client.employeeProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    if (!employeeProfile) {
      throw new BusinessException(
        'Employee profile not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const completedJobStatuses: JobStatus[] = [
      JobStatus.completed,
      JobStatus.cancelled,
      JobStatus.closed,
    ];

    const activeJobStatuses: JobStatus[] = [JobStatus.open, JobStatus.assigned];

    const where = {
      employee_id: employeeProfile.id,
      ...(query.status === 'active'
        ? {
            status: {
              in: [
                JobApplicationStatus.applied,
                JobApplicationStatus.accepted,
                JobApplicationStatus.confirmed,
              ],
            },
            job: {
              status: {
                in: activeJobStatuses,
              },
            },
          }
        : {}),
      ...(query.status === 'completed'
        ? {
            OR: [
              {
                status: {
                  in: [
                    JobApplicationStatus.rejected,
                    JobApplicationStatus.withdrawn,
                  ],
                },
              },
              {
                job: {
                  status: {
                    in: completedJobStatuses,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [appliedJobs, totalAppliedJobs] =
      await this.prisma.client.$transaction([
        this.prisma.client.jobApplication.findMany({
          where,
          select: {
            id: true,
            status: true,
            cover_note: true,
            applied_at: true,
            updated_at: true,
            job: {
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
                status: true,
                file: {
                  select: {
                    url: true,
                  },
                },
              },
            },
          },
          orderBy: {
            applied_at: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.client.jobApplication.count({ where }),
      ]);

    const data = appliedJobs.map((item) => {
      const isCompleted =
        item.status === JobApplicationStatus.rejected ||
        item.status === JobApplicationStatus.withdrawn ||
        completedJobStatuses.includes(item.job.status);

      return {
        application_id: item.id,
        application_status: item.status,
        cover_note: item.cover_note,
        applied_at: item.applied_at,
        updated_at: item.updated_at,
        list_state: isCompleted ? 'completed' : 'active',
        job: item.job,
      };
    });

    return {
      success: true,
      message: 'Applied jobs retrieved successfully',
      data,
      meta: {
        page,
        limit,
        totalAppliedJobs,
        totalPages: Math.ceil(totalAppliedJobs / limit),
      },
    };
  }
}
