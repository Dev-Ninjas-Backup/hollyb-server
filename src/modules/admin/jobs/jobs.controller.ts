import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobStatus, UserRole } from '@prisma';
import { JobsService } from './jobs.service';

@ApiTags('Admin Jobs')
@Controller('admin/jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get an overview of job statistics' })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  getOverview() {
    return this.jobsService.getOverview();
  }

  @Get('get-all')
  @ApiOperation({ summary: 'Get all jobs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: JobStatus,
    description: 'Filter by job status',
  })
  @ApiQuery({
    name: 'timeFilter',
    required: false,
    enum: ['today', 'yesterday', 'this_week', 'this_month'],
    description: 'Filter by time period',
  })
  getAllJobs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: JobStatus,
    @Query('timeFilter')
    timeFilter?: 'today' | 'yesterday' | 'this_week' | 'this_month',
  ) {
    return this.jobsService.getAllJobs({ page, limit, status, timeFilter });
  }

  @Get('get-all-recent')
  @ApiOperation({
    summary: 'Get recent jobs with basic info and time since last update',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent jobs retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  getAllRecentJobs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getAllRecentJobs({ page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }
}
