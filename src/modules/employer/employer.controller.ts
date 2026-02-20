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
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
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
        description: { type: 'string', example: 'Assist with packaging and sorting shipments.' },
        job_responsibilities: { type: 'string', example: 'Load/unload goods, manage inventory.' },
        requirements: { type: 'string', example: 'Must be able to lift 20kg.' },
        job_type: { type: 'string', enum: ['full_time', 'part_time', 'contract'], example: 'full_time' },
        is_urgent: { type: 'boolean', example: false },
        status: { type: 'string', enum: ['open', 'assigned', 'check_in', 'check_out', 'completed', 'cancelled'], example: 'open' },
        start_date: { type: 'string', format: 'date', example: '2026-03-01' },
        end_date: { type: 'string', format: 'date', example: '2026-03-31' },
        start_time: { type: 'string', format: 'date-time', example: '1970-01-01T08:00:00.000Z' },
        end_time: { type: 'string', format: 'date-time', example: '1970-01-01T17:00:00.000Z' },
        amount: { type: 'string', example: '1500.00' },
        payment_type: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'fixed'], example: 'hourly' },
        location: { type: 'string', example: 'New York, NY' },
        latitude: { type: 'number', example: 40.7128 },
        longitude: { type: 'number', example: -74.0060 },
        file: { type: 'string', format: 'binary', description: 'Optional file attachment for the job' },
      },
      required: ['title', 'company_name', 'job_type', 'payment_type'],
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
    return this.employerService.createJob(req.user.sub, dto, uploadedFiles?.file?.[0]);
  }

  // Get my posted jobs with filters and pagination
  // @Get('employer/jobs')
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Get my posted jobs with filters and pagination' })
  // async getMyJobs(
  //   @Req() req: AuthenticatedRequest,
  //   @Query('status') status?: string,
  //   @Query('job_type') job_type?: string,
  //   @Query('is_urgent') is_urgent?: boolean,
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 10,
  // ) {
  //   return this.employerService.getMyJobs(req.user.sub, filters);
  // }

}
