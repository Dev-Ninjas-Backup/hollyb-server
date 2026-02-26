import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  Prisma,
  FileType,
  JobStatus,
  JobApplicationStatus,
  SubscriptionPlanType,
} from '@prisma';
import { S3UploadService } from '@/common/upload/s3-upload.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateReviewJobDto } from './dto/review-completed-job.dto';

@Injectable()
export class EmployerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3UploadService: S3UploadService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private parseTimeToDate(time: string): Date {
    const normalizedTime = time.trim().replace(/\s+/g, ' ');

    const match24Hour = normalizedTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (match24Hour) {
      const hours = Number(match24Hour[1]);
      const minutes = Number(match24Hour[2]);
      return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
    }

    const match12Hour = normalizedTime.match(
      /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i,
    );
    if (match12Hour) {
      const hour12 = Number(match12Hour[1]);
      const minutes = Number(match12Hour[2]);
      const meridiem = match12Hour[3].toUpperCase();
      const hours = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
      return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
    }

    throw new BusinessException(
      'Invalid time format. Use HH:mm or hh:mm AM/PM',
      HttpStatus.BAD_REQUEST,
    );
  }

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

  /**
   * Create a new job posting
   */
  async createJob(
    userId: string,
    dto: CreateJobDto,
    files?: Express.Multer.File | undefined,
  ) {
    // check active subscription for employer before allowing job creation
    const hasActiveSubscription =
      await this.subscriptionService.checkActiveSubscription(
        userId,
        SubscriptionPlanType.employer_premium,
      );

    if (!hasActiveSubscription) {
      throw new BusinessException(
        'Active subscription required. Please subscribe before applying to jobs.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 1. Validate that expire_date is not provided (it's auto-calculated)
    if ((dto as any).expire_date) {
      throw new BusinessException(
        'expire_date is automatically calculated and cannot be manually set. It will be set to 30 days after job_date.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Get employer profile for the user
    const employerProfile = await this.prisma.client.employerProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true, company_name: true },
      },
    );

    if (!employerProfile) {
      throw new ResourceNotFoundException('Employer profile', userId);
    }

    // 3. Calculate expire_date as 30 days after job_date if job_date is provided
    let expireDate: Date | null = null;
    if (dto.job_date) {
      const jobDate = new Date(dto.job_date);
      expireDate = new Date(jobDate);
      expireDate.setDate(expireDate.getDate() + 30);
    }

    // 4. Calculate totalAmount if start_time, end_time, and amount are provided
    let totalAmount: Prisma.Decimal | null = null;
    if (dto.start_time && dto.end_time && dto.amount) {
      try {
        const startTime = this.parseTimeToDate(dto.start_time);
        const endTime = this.parseTimeToDate(dto.end_time);

        // Calculate hours difference
        const timeDiffMs = endTime.getTime() - startTime.getTime();
        const hours = timeDiffMs / (1000 * 60 * 60); // Convert milliseconds to hours

        if (hours <= 0) {
          throw new BusinessException(
            'End time must be after start time',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Calculate total amount: hours * amount
        const amount = parseFloat(dto.amount);
        const calculatedTotal = hours * amount;
        totalAmount = new Prisma.Decimal(calculatedTotal.toFixed(2));
      } catch (error) {
        if (error instanceof BusinessException) {
          throw error;
        }
        throw new BusinessException(
          'Invalid time format for totalAmount calculation',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 4. Upload file to S3 and create FileInstance if provided
    let fileInstance = null;
    if (files) {
      try {
        const fileUrl = await this.s3UploadService.uploadFile(
          userId,
          files,
          'jobs',
        );

        fileInstance = await this.prisma.client.fileInstance.create({
          data: {
            filename: `${Date.now()}-${files.originalname}`,
            originalFilename: files.originalname,
            path: fileUrl,
            url: fileUrl,
            fileType: this.getFileType(files.mimetype),
            mimeType: files.mimetype,
            size: files.size,
          },
        });
      } catch (error) {
        throw new BusinessException(
          'Failed to upload file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // 6. Prepare job data
    const jobData: Prisma.JobCreateInput = {
      title: dto.title,
      company_name: dto.company_name || employerProfile.company_name || 'N/A',
      description: dto.description,
      job_responsibilities: dto.job_responsibilities,
      requirements: dto.requirements,
      is_urgent:
        dto.is_urgent !== undefined && dto.is_urgent !== null
          ? Boolean(dto.is_urgent)
          : false,
      job_category: dto.job_category || null,
      job_date: dto.job_date ? new Date(dto.job_date) : null,
      expire_date: expireDate,
      start_time: dto.start_time ? this.parseTimeToDate(dto.start_time) : null,
      end_time: dto.end_time ? this.parseTimeToDate(dto.end_time) : null,
      amount: dto.amount ? new Prisma.Decimal(dto.amount) : null,
      totalAmount: totalAmount,
      location: dto.location,
      employer: {
        connect: { id: employerProfile.id },
      },
    };

    // Connect file if uploaded
    if (fileInstance) {
      jobData.file = {
        connect: { id: fileInstance.id },
      };
    }

    // 5. Create the job
    const job = await this.prisma.client.job.create({
      data: jobData,
      include: {
        employer: {
          select: {
            id: true,
            company_name: true,
            rating: true,
            profile_photo_url: true,
          },
        },
        file: true,
      },
    });

    return {
      success: true,
      message: 'Job created successfully',
      data: {
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      },
    };
  }

  /**
   * Get my posted jobs with filters and pagination
   */
  async getMyJobs(
    userId: string,
    status?: string,
    is_urgent?: boolean,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Update jobs to 'closed' status if expire_date has passed
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    await this.prisma.client.job.updateMany({
      where: {
        employer: { user_id: userId },
        expire_date: {
          lt: now,
        },
        status: {
          notIn: ['closed', 'completed', 'cancelled'],
        },
      },
      data: {
        status: 'closed',
      },
    });

    const whereConditions: any = { employer: { user_id: userId } };

    if (status) {
      whereConditions.status = status;
    }

    if (is_urgent !== undefined) {
      whereConditions.is_urgent = is_urgent;
    }

    const jobs = await this.prisma.client.job.findMany({
      where: whereConditions,
      select: {
        id: true,
        title: true,
        company_name: true,
        is_urgent: true,
        status: true,
        job_date: true,
        expire_date: true,
        file: {
          select: {
            url: true,
          },
        },
        start_time: true,
        end_time: true,
        amount: true,
        totalAmount: true,
        location: true,
        _count: {
          select: {
            job_applications: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    const totalJobs = await this.prisma.client.job.count({
      where: whereConditions,
    });

    return {
      success: true,
      message: 'Jobs retrieved successfully',
      data: jobs.map((job) => ({
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      })),
      paginationInfo: {
        page,
        limit,
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
      },
    };
  }

  /**
   * Get a specific job by ID
   */
  async getJobById(userId: string, jobId: string) {
    const job = await this.prisma.client.job.findUnique({
      where: {
        id: jobId,
        employer: { user_id: userId },
      },
      include: {
        employer: {
          select: {
            id: true,
            company_name: true,
            rating: true,
            profile_photo_url: true,
          },
        },
        file: true,
      },
    });

    if (!job) {
      throw new BusinessException(
        'Job not found or access denied',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      message: 'Job retrieved successfully',
      data: {
        ...job,
        start_time: this.formatTime12h(job.start_time),
        end_time: this.formatTime12h(job.end_time),
      },
    };
  }

  async updateJob(
    userId: string,
    jobId: string,
    dto: UpdateJobDto,
    files?: Express.Multer.File | undefined,
  ) {
    // 1. Get employer profile for the user
    const employerProfile = await this.prisma.client.employerProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true, company_name: true },
      },
    );

    if (!employerProfile) {
      throw new ResourceNotFoundException('Employer profile', userId);
    }

    // 2. Verify job exists and belongs to this employer
    const existingJob = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      include: { file: true },
    });

    if (!existingJob) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    if (existingJob.employer_id !== employerProfile.id) {
      throw new BusinessException(
        'You do not have permission to update this job',
        HttpStatus.FORBIDDEN,
      );
    }

    // 3. Calculate totalAmount if start_time, end_time, and amount are provided or updated
    let totalAmount: Prisma.Decimal | null = null;
    const startTime = dto.start_time
      ? this.parseTimeToDate(dto.start_time)
      : existingJob.start_time;
    const endTime = dto.end_time
      ? this.parseTimeToDate(dto.end_time)
      : existingJob.end_time;
    const amount = dto.amount
      ? parseFloat(dto.amount)
      : existingJob.amount
        ? parseFloat(existingJob.amount.toString())
        : null;

    if (startTime && endTime && amount) {
      try {
        // Calculate hours difference
        const timeDiffMs = endTime.getTime() - startTime.getTime();
        const hours = timeDiffMs / (1000 * 60 * 60); // Convert milliseconds to hours

        if (hours <= 0) {
          throw new BusinessException(
            'End time must be after start time',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Calculate total amount: hours * amount
        const calculatedTotal = hours * amount;
        totalAmount = new Prisma.Decimal(calculatedTotal.toFixed(2));
      } catch (error) {
        if (error instanceof BusinessException) {
          throw error;
        }
        throw new BusinessException(
          'Invalid time format for totalAmount calculation',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 4. Upload file to S3 and create FileInstance if provided
    let fileInstance = null;
    if (files) {
      try {
        const fileUrl = await this.s3UploadService.uploadFile(
          userId,
          files,
          'jobs',
        );

        fileInstance = await this.prisma.client.fileInstance.create({
          data: {
            filename: `${Date.now()}-${files.originalname}`,
            originalFilename: files.originalname,
            path: fileUrl,
            url: fileUrl,
            fileType: this.getFileType(files.mimetype),
            mimeType: files.mimetype,
            size: files.size,
          },
        });

        // Delete old file if exists (optional - uncomment if you want to delete old file)
        // if (existingJob.file) {
        //   await this.s3UploadService.deleteFile(existingJob.file.path);
        //   await this.prisma.client.fileInstance.delete({ where: { id: existingJob.file.id } });
        // }
      } catch (error) {
        throw new BusinessException(
          'Failed to upload file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // 5. Prepare job update data
    const updateData: Prisma.JobUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.company_name !== undefined)
      updateData.company_name = dto.company_name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.job_responsibilities !== undefined)
      updateData.job_responsibilities = dto.job_responsibilities;
    if (dto.requirements !== undefined)
      updateData.requirements = dto.requirements;
    if (dto.is_urgent !== undefined)
      updateData.is_urgent = Boolean(dto.is_urgent);
    if (dto.job_category !== undefined)
      updateData.job_category = dto.job_category;
    if (dto.start_time !== undefined)
      updateData.start_time = this.parseTimeToDate(dto.start_time);
    if (dto.end_time !== undefined)
      updateData.end_time = this.parseTimeToDate(dto.end_time);
    if (dto.amount !== undefined)
      updateData.amount = new Prisma.Decimal(dto.amount);
    if (dto.location !== undefined) updateData.location = dto.location;
    if (totalAmount !== null) updateData.totalAmount = totalAmount;

    // Connect new file if uploaded
    if (fileInstance) {
      updateData.file = {
        connect: { id: fileInstance.id },
      };
    }

    // 6. Update the job
    const updatedJob = await this.prisma.client.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        employer: {
          select: {
            id: true,
            company_name: true,
            rating: true,
            profile_photo_url: true,
          },
        },
        file: true,
      },
    });

    return {
      success: true,
      message: 'Job updated successfully',
      data: {
        ...updatedJob,
        start_time: this.formatTime12h(updatedJob.start_time),
        end_time: this.formatTime12h(updatedJob.end_time),
      },
    };
  }

  /**
   * Determine FileType enum value based on MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.image;
    if (mimeType.startsWith('video/')) return FileType.video;
    if (mimeType.startsWith('audio/')) return FileType.audio;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return FileType.document;
    return FileType.any;
  }

  async getJobApplications(userId: string, jobId: string) {
    const employerProfile = await this.prisma.client.employerProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    if (!employerProfile) {
      throw new ResourceNotFoundException('Employer profile', userId);
    }

    const job = await this.prisma.client.job.findUnique({
      where: {
        id: jobId,
        employer_id: employerProfile.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        assigned_employee_id: true,
      },
    });

    if (!job) {
      throw new BusinessException(
        'Job not found or access denied',
        HttpStatus.NOT_FOUND,
      );
    }

    const applications = await this.prisma.client.jobApplication.findMany({
      where: {
        job_id: jobId,
      },
      select: {
        id: true,
        status: true,
        cover_note: true,
        applied_at: true,
        updated_at: true,
        employee: {
          select: {
            id: true,
            user_id: true,
            profile_photo_url: true,
            rating: true,
            total_jobs: true,
            total_hours: true,
            experience_years: true,
            bio: true,
            user: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        applied_at: 'desc',
      },
    });

    return {
      success: true,
      message: 'Job applications retrieved successfully',
      data: {
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          hasAssignedEmployee: !!job.assigned_employee_id,
        },
        applications,
        totalApplications: applications.length,
      },
    };
  }

  async acceptApplication(userId: string, applicationId: string) {
    const employerProfile = await this.prisma.client.employerProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    if (!employerProfile) {
      throw new ResourceNotFoundException('Employer profile', userId);
    }

    const application = await this.prisma.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            employer_id: true,
            status: true,
            assigned_employee_id: true,
          },
        },
        employee: {
          select: {
            id: true,
            user: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new BusinessException(
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.job.employer_id !== employerProfile.id) {
      throw new BusinessException(
        'You do not have permission to manage this application',
        HttpStatus.FORBIDDEN,
      );
    }

    if (application.status !== JobApplicationStatus.applied) {
      throw new BusinessException(
        `Application is already ${application.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (application.job.status !== JobStatus.open) {
      throw new BusinessException(
        'Job is not open for accepting applications',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (application.job.assigned_employee_id) {
      throw new BusinessException(
        'This job is already assigned to another employee',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.client.$transaction([
      this.prisma.client.job.updateMany({
        where: {
          assigned_employee_id: application.employee.id,
          status: { in: [JobStatus.assigned, JobStatus.open] },
        },
        data: {
          assigned_employee_id: null,
          status: JobStatus.open,
        },
      }),
      this.prisma.client.jobApplication.update({
        where: { id: applicationId },
        data: { status: JobApplicationStatus.accepted },
      }),
      this.prisma.client.job.update({
        where: { id: application.job.id },
        data: {
          status: JobStatus.assigned,
          assigned_employee_id: application.employee.id,
        },
      }),
      this.prisma.client.jobApplication.updateMany({
        where: {
          job_id: application.job.id,
          id: { not: applicationId },
          status: JobApplicationStatus.applied,
        },
        data: {
          status: JobApplicationStatus.rejected,
        },
      }),
    ]);

    return {
      success: true,
      message: `Application accepted. ${application.employee.user.full_name} is now assigned to this job.`,
      data: {
        applicationId,
        jobId: application.job.id,
        employeeId: application.employee.id,
        status: JobApplicationStatus.accepted,
      },
    };
  }

  async rejectApplication(userId: string, applicationId: string) {
    const employerProfile = await this.prisma.client.employerProfile.findUnique(
      {
        where: { user_id: userId },
        select: { id: true },
      },
    );

    if (!employerProfile) {
      throw new ResourceNotFoundException('Employer profile', userId);
    }

    const application = await this.prisma.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            employer_id: true,
          },
        },
      },
    });

    if (!application) {
      throw new BusinessException(
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.job.employer_id !== employerProfile.id) {
      throw new BusinessException(
        'You do not have permission to manage this application',
        HttpStatus.FORBIDDEN,
      );
    }

    if (application.status !== JobApplicationStatus.applied) {
      throw new BusinessException(
        `Application is already ${application.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.client.jobApplication.update({
      where: { id: applicationId },
      data: { status: JobApplicationStatus.rejected },
    });

    return {
      success: true,
      message: 'Application rejected successfully',
      data: {
        applicationId,
        status: JobApplicationStatus.rejected,
      },
    };
  }

  async createReviewJob(job_id: string, dto: CreateReviewJobDto) {
    const job = await this.prisma.client.job.findUnique({
      where: { id: job_id },
      include: {
        employer: true,
        assigned_employee: true,
        review: true,
      },
    });

    if (!job) {
      throw new BusinessException('Job not found', HttpStatus.NOT_FOUND);
    }

    if (job.status !== JobStatus.completed) {
      throw new BusinessException(
        'Only completed jobs can be reviewed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!job.assigned_employee_id) {
      throw new BusinessException(
        'Cannot review a job without an assigned employee',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (job.review) {
      throw new BusinessException(
        'This job has already been reviewed',
        HttpStatus.CONFLICT,
      );
    }

    // Validate rating range
    if (dto.rating < 0 || dto.rating > 5) {
      throw new BusinessException(
        'Rating must be between 0 and 5',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create review and update employee profile in a transaction
    const result = await this.prisma.client.$transaction(async (tx) => {
      // Create the review
      const review = await tx.review.create({
        data: {
          job_id: job_id,
          employee_id: job.assigned_employee_id!,
          rating: dto.rating,
          comment: dto.comment || null,
        },
      });

      // Get all reviews for this employee to recalculate average rating
      const allReviews = await tx.review.findMany({
        where: { employee_id: job.assigned_employee_id! },
        select: {
          rating: true,
        },
      });

      // Calculate new average rating
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / allReviews.length;

      // Update employee profile with new rating and review count
      const updatedEmployee = await tx.employeeProfile.update({
        where: { id: job.assigned_employee_id! },
        data: {
          rating: averageRating,
          total_reviews: allReviews.length,
        },
      });

      return { review, updatedEmployee };
    });

    return {
      success: true,
      message: 'Job reviewed and employee profile updated successfully',
      data: {
        reviewId: result.review.id,
        rating: result.review.rating,
        employeeNewRating: result.updatedEmployee.rating,
        employeeTotalReviews: result.updatedEmployee.total_reviews,
      },
    };
  }

  async getAllReviews(
    page: number = 1,
    limit: number = 10,
    employeeId?: string,
    jobId?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereConditions: Prisma.ReviewWhereInput = {};

    if (employeeId) {
      whereConditions.employee_id = employeeId;
    }

    if (jobId) {
      whereConditions.job_id = jobId;
    }

    const reviews = await this.prisma.client.review.findMany({
      where: whereConditions,
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
        updated_at: true,
        job: {
          select: {
            id: true,
            title: true,
            company_name: true,
            status: true,
            job_date: true,
            location: true,
          },
        },
        employee: {
          select: {
            id: true,
            profile_photo_url: true,
            rating: true,
            total_reviews: true,
            user: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    const totalReviews = await this.prisma.client.review.count({
      where: whereConditions,
    });

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data: reviews,
      paginationInfo: {
        page,
        limit,
        totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
      },
    };
  }
}
