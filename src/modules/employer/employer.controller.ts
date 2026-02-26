import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '@/common/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmployerService } from './employer.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateReviewJobDto } from './dto/review-completed-job.dto';

@ApiTags('Employer')
@Controller('employer')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  // Create a new job posting
  @Post('job/create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiOperation({ summary: 'Create a new job posting' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Warehouse Assistant' },
        company_name: { type: 'string', example: 'Amazon Logistics' },
        description: {
          type: 'string',
          example: 'Assist with packaging and sorting shipments.',
        },
        job_category: {
          type: 'string',
          enum: [
            'chef',
            'sous_chef',
            'line_cook',
            'pastry_chef',
            'cleaner',
            'dishwasher',
            'helper',
            'helper',
            'server',
            'waiter',
            'bartender',
            'host',
            'manager',
            'supervisor',
          ],
          example: 'chef',
        },
        job_responsibilities: {
          type: 'string',
          example: 'Load/unload goods, manage inventory.',
        },
        requirements: { type: 'string', example: 'Must be able to lift 20kg.' },
        is_urgent: { type: 'boolean', example: false },
        job_date: {
          type: 'string',
          format: 'date',
          example: '2026-03-01',
          description: 'Must be within expire_date',
        },
        start_time: {
          type: 'string',
          example: '03:30 PM',
          description: 'Shift start time in HH:mm or hh:mm AM/PM format',
        },
        end_time: {
          type: 'string',
          example: '05:30 PM',
          description: 'Shift end time in HH:mm or hh:mm AM/PM format',
        },
        amount: { type: 'string', example: '1500.00' },
        location: { type: 'string', example: 'New York, NY' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Optional file attachment for the job',
        },
      },
      required: ['title', 'company_name'],
    },
  })
  async createJob(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateJobDto,
    @UploadedFiles()
    uploadedFiles?: {
      file?: Express.Multer.File[];
    },
  ) {
    return this.employerService.createJob(
      req.user.sub,
      dto,
      uploadedFiles?.file?.[0],
    );
  }

  // Get my posted jobs with filters and pagination
  @Get('jobs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my posted jobs with filters and pagination' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'assigned', 'completed', 'cancelled', 'closed'],
    description: 'Filter by job status',
    example: 'open',
  })
  @ApiQuery({
    name: 'is_urgent',
    required: false,
    type: Boolean,
    description: 'Filter by urgent jobs',
    example: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  async getMyJobs(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('is_urgent') is_urgent?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isUrgent =
      is_urgent === 'true' ? true : is_urgent === 'false' ? false : undefined;

    return this.employerService.getMyJobs(
      req.user.sub,
      status,
      isUrgent,
      pageNum,
      limitNum,
    );
  }

  @Get('jobs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific job by ID' })
  async getJobById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.employerService.getJobById(req.user.sub, id);
  }

  // Update a job posting
  @Patch('jobs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a job posting (cannot change start_date or end_date)',
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update job data with optional file upload',
    type: UpdateJobDto,
  })
  async updateJob(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @UploadedFiles()
    uploadedFiles?: {
      file?: Express.Multer.File[];
    },
  ) {
    return this.employerService.updateJob(
      req.user.sub,
      id,
      dto,
      uploadedFiles?.file?.[0],
    );
  }

  @Get('jobs/:jobId/applications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all applications for a specific job' })
  @ApiResponse({
    status: 200,
    description: 'Job applications retrieved successfully',
  })
  async getJobApplications(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ) {
    return this.employerService.getJobApplications(req.user.sub, jobId);
  }

  @Post('applications/:applicationId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiOperation({
    summary: 'Accept job application and assign employee to job',
  })
  @ApiResponse({
    status: 201,
    description: 'Application accepted and employee assigned successfully',
  })
  async acceptApplication(
    @Req() req: AuthenticatedRequest,
    @Param('applicationId') applicationId: string,
  ) {
    return this.employerService.acceptApplication(req.user.sub, applicationId);
  }

  @Post('applications/:applicationId/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiOperation({ summary: 'Reject job application' })
  @ApiResponse({
    status: 201,
    description: 'Application rejected successfully',
  })
  async rejectApplication(
    @Req() req: AuthenticatedRequest,
    @Param('applicationId') applicationId: string,
  ) {
    return this.employerService.rejectApplication(req.user.sub, applicationId);
  }

  @Post('review/create/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiOperation({ summary: 'Review completed job and update employer profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', example: 'Amazon Logistics' },
        contact_email: { type: 'string', example: 'contact@amazon.com' },
      },
    },
  })
  async reviewCompletedJob(
    @Param('id') id: string,
    @Body() dto: CreateReviewJobDto,
  ) {
    return this.employerService.createReviewJob(id, dto);
  }

  @Get('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all reviews with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    type: String,
    description: 'Filter by employee ID',
  })
  @ApiQuery({
    name: 'jobId',
    required: false,
    type: String,
    description: 'Filter by job ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  async getAllReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('jobId') jobId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.employerService.getAllReviews(
      pageNum,
      limitNum,
      employeeId,
      jobId,
    );
  }

  
}
