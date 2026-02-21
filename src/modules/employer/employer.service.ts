import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { CreateJobDto } from './dto/create-job.dto';
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
   * @param userId - Authenticated user ID
   * @param dto - Job creation data
   * @returns Created job with relations
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
    if (dto.start_date) {
      const startDate = new Date(dto.start_date);
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

    // Calculate end_date: created_at + 1 month
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // 4. Prepare job data
    const jobData: Prisma.JobCreateInput = {
      title: dto.title,
      company_name: dto.company_name || employerProfile.company_name || 'N/A',
      description: dto.description,
      job_responsibilities: dto.job_responsibilities,
      requirements: dto.requirements,
      is_urgent: dto.is_urgent !== undefined && dto.is_urgent !== null ? Boolean(dto.is_urgent) : false,
      start_date: dto.start_date ? new Date(dto.start_date) : null,
      end_date: endDate,
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
        start_date: true,
        end_date: true,
        start_time: true,
        end_time: true,
        amount: true,
        totalAmount: true,
        location: true,
        _count: {
          select: {
            job_applications: true,
          }
        }
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
