import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { CreateJobDto } from './dto/create-job.dto';
import { Prisma, FileType } from '@prisma';
import { S3UploadService } from '@/common/upload/s3-upload.service';

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
    if (dto.start_date && dto.end_date) {
      const startDate = new Date(dto.start_date);
      const endDate = new Date(dto.end_date);

      if (endDate < startDate) {
        throw new BusinessException(
          'End date cannot be before start date',
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
      job_type: dto.job_type,
      is_urgent: dto.is_urgent ?? false,
      status: dto.status ?? 'open',
      start_date: dto.start_date ? new Date(dto.start_date) : null,
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      start_time: dto.start_time ? new Date(dto.start_time) : null,
      end_time: dto.end_time ? new Date(dto.end_time) : null,
      amount: dto.amount ? new Prisma.Decimal(dto.amount) : null,
      payment_type: dto.payment_type,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
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
        job_skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
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
