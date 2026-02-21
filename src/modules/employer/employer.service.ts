import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Prisma, FileType } from '@prisma';
import { S3UploadService } from '@/common/upload/s3-upload.service';
import { count } from 'console';

@Injectable()
export class EmployerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  /**
   * Create a new job posting
   */
  async createJob(
    userId: string,
    dto: CreateJobDto,
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

    // 2. Validate dates if provided
    if (dto.job_date && dto.expire_date) {
      const jobDate = new Date(dto.job_date);
      const expireDate = new Date(dto.expire_date);
      
      // Check if job_date is after expire_date
      if (jobDate > expireDate) {
        throw new BusinessException(
          'Job date must be within the expire date',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 3. Calculate totalAmount if start_time, end_time, and amount are provided
    let totalAmount: Prisma.Decimal | null = null;
    if (dto.start_time && dto.end_time && dto.amount) {
      try {
        const startTime = new Date(dto.start_time);
        const endTime = new Date(dto.end_time);

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

    // 4. Prepare job data
    const jobData: Prisma.JobCreateInput = {
      title: dto.title,
      company_name: dto.company_name || employerProfile.company_name || 'N/A',
      description: dto.description,
      job_responsibilities: dto.job_responsibilities,
      requirements: dto.requirements,
      is_urgent: dto.is_urgent !== undefined && dto.is_urgent !== null ? Boolean(dto.is_urgent) : false,
      job_date: dto.job_date ? new Date(dto.job_date) : null,
      expire_date: dto.expire_date ? new Date(dto.expire_date) : null,
      start_time: dto.start_time ? new Date(dto.start_time) : null,
      end_time: dto.end_time ? new Date(dto.end_time) : null,
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
      data: job,
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
    now.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
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
            url: true
          }
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
      data: jobs,
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
        employer: { user_id: userId }
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
        file: true
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
      data: job,
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
      throw new BusinessException(
        'Job not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (existingJob.employer_id !== employerProfile.id) {
      throw new BusinessException(
        'You do not have permission to update this job',
        HttpStatus.FORBIDDEN,
      );
    }

    // 3. Calculate totalAmount if start_time, end_time, and amount are provided or updated
    let totalAmount: Prisma.Decimal | null = null;
    const startTime = dto.start_time ? new Date(dto.start_time) : existingJob.start_time;
    const endTime = dto.end_time ? new Date(dto.end_time) : existingJob.end_time;
    const amount = dto.amount ? parseFloat(dto.amount) : (existingJob.amount ? parseFloat(existingJob.amount.toString()) : null);

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
    if (dto.company_name !== undefined) updateData.company_name = dto.company_name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.job_responsibilities !== undefined) updateData.job_responsibilities = dto.job_responsibilities;
    if (dto.requirements !== undefined) updateData.requirements = dto.requirements;
    if (dto.is_urgent !== undefined) updateData.is_urgent = Boolean(dto.is_urgent);
    if (dto.start_time !== undefined) updateData.start_time = new Date(dto.start_time);
    if (dto.end_time !== undefined) updateData.end_time = new Date(dto.end_time);
    if (dto.amount !== undefined) updateData.amount = new Prisma.Decimal(dto.amount);
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
      data: updatedJob,
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
}
