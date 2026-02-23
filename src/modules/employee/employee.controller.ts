import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobCategory } from '@prisma';
import { EmployeeService } from './employee.service';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';

@ApiTags('Employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('latest-jobs')
  @ApiOperation({ summary: 'Get latest 5 open jobs' })
  @ApiResponse({
    status: 200,
    description: 'Latest jobs retrieved successfully',
  })
  getLatestJobs() {
    return this.employeeService.getLatestJobs();
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Get jobs with search, category filter and pagination',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title, company_name, description and requirements',
  })
  @ApiQuery({
    name: 'job_category',
    required: false,
    enum: JobCategory,
    description: 'Filter by job category',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  getJobs(@Query() query: GetJobsQueryDto) {
    return this.employeeService.getJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job details by id' })
  @ApiParam({ name: 'id', type: String, description: 'Job id (uuid)' })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getJobById(@Param('id') id: string) {
    return this.employeeService.getJobById(id);
  }
}
