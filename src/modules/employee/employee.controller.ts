import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobCategory } from '@prisma';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { EmployeeService } from './employee.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
@ApiTags('Employee jobs')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('latest-jobs')
  @ApiOperation({ summary: 'Get latest 5 open jobs' })
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
  @ApiResponse({
    status: 200,
    description: 'Latest jobs retrieved successfully',
  })
  getLatestJobs(@Req() req: any, @Query() query: GetJobsQueryDto) {
    return this.employeeService.getLatestJobs(req.user.sub, query);
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

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employee stats by employee id' })
  @ApiResponse({
    status: 200,
    description: 'Employee stats retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  getJobStats(@Req() req: any) {
    return this.employeeService.getJobStats(req.user.sub);
  }
}
