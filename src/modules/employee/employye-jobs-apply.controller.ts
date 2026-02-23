import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmployeeJobsApplyService } from './employee-jobs-apply.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { GetAppliedJobsQueryDto } from './dto/get-applied-jobs-query.dto';

@ApiTags('Employee Job Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
@Controller('employee/jobs')
export class EmployyeJobsApplyController {
  constructor(
    private readonly employeeJobsApplyService: EmployeeJobsApplyService,
  ) {}

  @Post(':jobId/apply')
  @ApiOperation({
    summary: 'Apply to a job (requires active employee subscription)',
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job id (uuid)',
  })
  @ApiResponse({
    status: 201,
    description: 'Job application submitted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Active subscription required to apply',
  })
  applyToJob(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.employeeJobsApplyService.applyToJob(req.user.sub, jobId, dto);
  }

  @Get('applied')
  @ApiOperation({
    summary: 'Get my applied jobs with active/completed filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'completed'],
    description: 'Filter by applied jobs state',
    example: 'active',
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
  @ApiResponse({
    status: 200,
    description: 'Applied jobs retrieved successfully',
  })
  getAppliedJobs(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetAppliedJobsQueryDto,
  ) {
    return this.employeeJobsApplyService.getAppliedJobs(req.user.sub, query);
  }
}
