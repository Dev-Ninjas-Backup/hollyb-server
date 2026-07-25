import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { SubscriptionRequired } from '@/common/decorators/subscription-required.decorator';
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
  @SubscriptionRequired()
  @UseGuards(SubscriptionGuard)
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

  @Get(':jobId/details')
  @ApiOperation({
    summary: 'Get assigned job details with shift progress and summary',
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job id (uuid)',
  })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved successfully',
  })
  getJobDetails(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ) {
    return this.employeeJobsApplyService.getJobDetails(req.user.sub, jobId);
  }

  @Post(':jobId/check-in')
  @SubscriptionRequired()
  @UseGuards(SubscriptionGuard)
  @ApiOperation({
    summary:
      'Check in to assigned shift (requires active employee subscription)',
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job id (uuid)',
  })
  @ApiResponse({
    status: 201,
    description: 'Checked in successfully',
  })
  checkIn(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.employeeJobsApplyService.checkIn(req.user.sub, jobId);
  }

  @Post(':jobId/check-out')
  @SubscriptionRequired()
  @UseGuards(SubscriptionGuard)
  @ApiOperation({
    summary:
      'Check out from assigned shift (requires active employee subscription)',
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job id (uuid)',
  })
  @ApiResponse({
    status: 201,
    description: 'Checked out successfully',
  })
  checkOut(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.employeeJobsApplyService.checkOut(req.user.sub, jobId);
  }

  @Post(':jobId/mark-as-complete')
  @SubscriptionRequired()
  @UseGuards(SubscriptionGuard)
  @ApiOperation({
    summary:
      'Mark assigned shift as completed (requires active employee subscription)',
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job id (uuid)',
  })
  @ApiResponse({
    status: 201,
    description: 'Shift marked as completed successfully',
  })
  markAsComplete(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ) {
    return this.employeeJobsApplyService.markAsComplete(req.user.sub, jobId);
  }
}
