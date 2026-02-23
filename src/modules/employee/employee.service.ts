import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';
import { BusinessException } from '@/common/exceptions/business.exception';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestJobs() {
    const jobs = await this.prisma.client.job.findMany({
      where: {
        status: 'open',
      },
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
    });

    return {
      success: true,
      message: 'Latest jobs retrieved successfully',
      data: jobs,
    };
  }

  async getJobs(query: GetJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      status: 'open',
      ...(query.job_category ? { job_category: query.job_category } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                company_name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                requirements: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

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
      data: jobs,
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
      data: job,
    };
  }
}
