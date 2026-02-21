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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

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
        job_responsibilities: {
          type: 'string',
          example: 'Load/unload goods, manage inventory.',
        },
        requirements: { type: 'string', example: 'Must be able to lift 20kg.' },
        is_urgent: { type: 'boolean', example: false },
        start_date: { type: 'string', format: 'date', example: '2026-03-01' },
        start_time: { type: 'string', format: 'date-time', example: '1970-01-01T08:00:00.000Z' },
        end_time: { type: 'string', format: 'date-time', example: '1970-01-01T17:00:00.000Z' },
        amount: { type: 'string', example: '1500.00' },
        location: { type: 'string', example: 'New York, NY' },
        file: { type: 'string', format: 'binary', description: 'Optional file attachment for the job' },
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiOperation({ summary: 'Get my posted jobs with filters and pagination' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'assigned', 'check_in', 'check_out', 'completed', 'cancelled'],
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
    const isUrgent = is_urgent === 'true' ? true : is_urgent === 'false' ? false : undefined;
    
    return this.employerService.getMyJobs(req.user.sub, status, isUrgent, pageNum, limitNum);
  }

}
