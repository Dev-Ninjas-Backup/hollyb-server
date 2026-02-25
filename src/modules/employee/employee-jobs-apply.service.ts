import { HttpStatus, Injectable } from '@nestjs/common';
import {
  SubscriptionPlanType,
  JobStatus,
  JobApplicationStatus,
  ShiftStatus,
} from '@prisma';
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
        job: {
          ...item.job,
          start_time: this.formatTime12h(item.job.start_time),
          end_time: this.formatTime12h(item.job.end_time),
        },
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

  async getJobDetails(userId: string, jobId: string) {
    const { employeeProfile, job } = await this.getAssignedJobContext(
      userId,
      jobId,
    );

    const { scheduledStartAt, scheduledEndAt, requiredWorkSeconds } =
      this.getShiftSchedule(job.job_date, job.start_time, job.end_time);

    const shift = await this.prisma.client.jobShift.findUnique({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
    });

    const now = new Date();
    const activeSessionSeconds = shift?.checked_in_at
      ? Math.max(
          Math.floor((now.getTime() - shift.checked_in_at.getTime()) / 1000),
          0,
        )
      : 0;

    const totalWorkedSeconds =
      (shift?.total_worked_seconds ?? 0) + activeSessionSeconds;
    const remainingSeconds = Math.max(
      requiredWorkSeconds - totalWorkedSeconds,
      0,
    );
    const progressPercentage =
      requiredWorkSeconds > 0
        ? Math.min((totalWorkedSeconds / requiredWorkSeconds) * 100, 100)
        : 0;
    const isCheckedIn = !!shift?.checked_in_at;
    const isCompleted = shift?.status === ShiftStatus.completed;

    const canCheckIn =
      !isCompleted &&
      !isCheckedIn &&
      now >= scheduledStartAt &&
      now <= scheduledEndAt;
    const canCheckOut = !isCompleted && isCheckedIn;
    const canMarkAsComplete =
      !isCompleted && !isCheckedIn && remainingSeconds === 0;

    const estimatedPay = this.calculateEstimatedPay(
      job.amount?.toString(),
      job.totalAmount?.toString(),
      requiredWorkSeconds,
    );

    return {
      success: true,
      message: 'Job details retrieved successfully',
      data: {
        job: {
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          location: job.location,
          description: job.description,
          requirements: job.requirements,
          amount: job.amount,
          totalAmount: job.totalAmount,
          job_date: job.job_date,
          start_time: this.formatTime12h(job.start_time),
          end_time: this.formatTime12h(job.end_time),
          status: job.status,
          file: job.file,
        },
        shiftProgress: {
          progressPercentage: Number(progressPercentage.toFixed(2)),
          totalWorkedSeconds,
          totalWorkedDuration: this.formatDuration(totalWorkedSeconds),
          remainingSeconds,
          remainingDuration: this.formatDuration(remainingSeconds),
          requiredWorkSeconds,
          requiredWorkDuration: this.formatDuration(requiredWorkSeconds),
          progressLabel: `${this.formatDuration(remainingSeconds)} remaining`,
        },
        shiftActions: {
          isCheckedIn,
          isCompleted,
          canCheckIn,
          canCheckOut,
          canMarkAsComplete,
          checkedInAt: shift?.checked_in_at ?? null,
          checkedOutAt: shift?.checked_out_at ?? null,
          status: shift?.status ?? ShiftStatus.in_progress,
        },
        summary: {
          totalShiftHours: Number((requiredWorkSeconds / 3600).toFixed(2)),
          estimatedPay,
          estimatedPayDisplay: `$${estimatedPay.toFixed(2)}`,
        },
      },
    };
  }

  async checkIn(userId: string, jobId: string) {
    const { employeeProfile, job } = await this.getAssignedJobContext(
      userId,
      jobId,
    );

    const { scheduledStartAt, scheduledEndAt } = this.getShiftSchedule(
      job.job_date,
      job.start_time,
      job.end_time,
    );

    const now = new Date();

    if (now < scheduledStartAt) {
      throw new BusinessException(
        'Check-in is not allowed before the job start time.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (now > scheduledEndAt) {
      throw new BusinessException(
        'Shift time is already over. Check-in is not allowed now.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingShift = await this.prisma.client.jobShift.findUnique({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
    });

    if (existingShift?.status === ShiftStatus.completed) {
      throw new BusinessException(
        'This shift is already completed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingShift?.checked_in_at) {
      throw new BusinessException(
        'You are already checked in for this shift.',
        HttpStatus.CONFLICT,
      );
    }

    const shift = await this.prisma.client.jobShift.upsert({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
      create: {
        job_id: job.id,
        employee_id: employeeProfile.id,
        checked_in_at: now,
        status: ShiftStatus.in_progress,
      },
      update: {
        checked_in_at: now,
        status: ShiftStatus.in_progress,
      },
      select: {
        id: true,
        checked_in_at: true,
        status: true,
      },
    });

    return {
      success: true,
      message: 'Checked in successfully',
      data: shift,
    };
  }

  async checkOut(userId: string, jobId: string) {
    const { employeeProfile, job } = await this.getAssignedJobContext(
      userId,
      jobId,
    );

    const { requiredWorkSeconds } = this.getShiftSchedule(
      job.job_date,
      job.start_time,
      job.end_time,
    );

    const existingShift = await this.prisma.client.jobShift.findUnique({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
    });

    if (!existingShift || !existingShift.checked_in_at) {
      throw new BusinessException(
        'You must check in before checking out.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingShift.status === ShiftStatus.completed) {
      throw new BusinessException(
        'This shift is already completed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    const workedThisSessionSeconds = Math.max(
      Math.floor(
        (now.getTime() - existingShift.checked_in_at.getTime()) / 1000,
      ),
      0,
    );
    const totalWorkedSeconds =
      existingShift.total_worked_seconds + workedThisSessionSeconds;
    const remainingSeconds = Math.max(
      requiredWorkSeconds - totalWorkedSeconds,
      0,
    );

    const shift = await this.prisma.client.jobShift.update({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
      data: {
        checked_out_at: now,
        checked_in_at: null,
        total_worked_seconds: totalWorkedSeconds,
      },
      select: {
        id: true,
        checked_out_at: true,
        total_worked_seconds: true,
        status: true,
      },
    });

    return {
      success: true,
      message: 'Checked out successfully',
      data: {
        ...shift,
        workedThisSessionSeconds,
        workedThisSessionDuration: this.formatDuration(
          workedThisSessionSeconds,
        ),
        remainingSeconds,
        remainingDuration: this.formatDuration(remainingSeconds),
      },
    };
  }

  async markAsComplete(userId: string, jobId: string) {
    const { employeeProfile, job } = await this.getAssignedJobContext(
      userId,
      jobId,
    );

    const { requiredWorkSeconds } = this.getShiftSchedule(
      job.job_date,
      job.start_time,
      job.end_time,
    );

    const existingShift = await this.prisma.client.jobShift.findUnique({
      where: {
        job_id_employee_id: {
          job_id: job.id,
          employee_id: employeeProfile.id,
        },
      },
    });

    if (!existingShift) {
      throw new BusinessException(
        'No shift work found. Please check in and check out first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingShift.status === ShiftStatus.completed) {
      throw new BusinessException(
        'This shift is already completed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingShift.checked_in_at) {
      throw new BusinessException(
        'Please check out before marking this shift as completed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const remainingSeconds = Math.max(
      requiredWorkSeconds - existingShift.total_worked_seconds,
      0,
    );

    if (remainingSeconds > 0) {
      throw new BusinessException(
        `You need to work ${this.formatDuration(remainingSeconds)} more before marking as complete.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();

    await this.prisma.client.$transaction([
      this.prisma.client.jobShift.update({
        where: {
          job_id_employee_id: {
            job_id: job.id,
            employee_id: employeeProfile.id,
          },
        },
        data: {
          status: ShiftStatus.completed,
          checked_out_at: existingShift.checked_out_at ?? now,
        },
      }),
      this.prisma.client.job.update({
        where: { id: job.id },
        data: { status: JobStatus.completed },
      }),
      this.prisma.client.jobApplication.updateMany({
        where: {
          job_id: job.id,
          employee_id: employeeProfile.id,
          status: {
            in: [JobApplicationStatus.accepted, JobApplicationStatus.confirmed],
          },
        },
        data: {
          status: JobApplicationStatus.confirmed,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Shift marked as completed successfully',
      data: {
        jobId: job.id,
        status: JobStatus.completed,
      },
    };
  }

  private async getAssignedJobContext(userId: string, jobId: string) {
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

    const jobRecord = await this.prisma.client.job.findUnique({
      where: { id: jobId },
    });

    if (!jobRecord) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    if (jobRecord.assigned_employee_id !== employeeProfile.id) {
      throw new BusinessException(
        'You are not assigned to this job.',
        HttpStatus.FORBIDDEN,
      );
    }

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        company_name: true,
        location: true,
        description: true,
        requirements: true,
        amount: true,
        totalAmount: true,
        status: true,
        job_date: true,
        start_time: true,
        end_time: true,
        assigned_employee_id: true,
        file: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!job) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    return { employeeProfile, job };
  }

  private getShiftSchedule(
    jobDate: Date | null,
    startTime: Date | null,
    endTime: Date | null,
  ) {
    if (!jobDate || !startTime || !endTime) {
      throw new BusinessException(
        'Shift schedule is incomplete for this job.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const scheduledStartAt = this.combineDateAndTime(jobDate, startTime);
    let scheduledEndAt = this.combineDateAndTime(jobDate, endTime);

    if (scheduledEndAt <= scheduledStartAt) {
      scheduledEndAt = new Date(scheduledEndAt.getTime() + 24 * 60 * 60 * 1000);
    }

    const requiredWorkSeconds = Math.floor(
      (scheduledEndAt.getTime() - scheduledStartAt.getTime()) / 1000,
    );

    if (requiredWorkSeconds <= 0) {
      throw new BusinessException(
        'Invalid shift schedule. End time must be after start time.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      scheduledStartAt,
      scheduledEndAt,
      requiredWorkSeconds,
    };
  }

  private combineDateAndTime(datePart: Date, timePart: Date) {
    const combined = new Date(datePart);
    combined.setHours(
      timePart.getUTCHours(),
      timePart.getUTCMinutes(),
      timePart.getUTCSeconds(),
      timePart.getUTCMilliseconds(),
    );
    return combined;
  }

  private calculateEstimatedPay(
    amount: string | undefined,
    totalAmount: string | undefined,
    requiredWorkSeconds: number,
  ) {
    if (totalAmount) {
      return Number(totalAmount);
    }

    if (amount) {
      const hourly = Number(amount);
      const totalHours = requiredWorkSeconds / 3600;
      return Number((hourly * totalHours).toFixed(2));
    }

    return 0;
  }

  private formatDuration(totalSeconds: number) {
    const safeSeconds = Math.max(totalSeconds, 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours === 0) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
  }
}
