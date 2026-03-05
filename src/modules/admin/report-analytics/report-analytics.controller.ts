import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma';
import { ResponseHelper } from '@/common/utils/response.helper';
import { ReportAnalyticsService } from './report-analytics.service';
import {
  ApiSuccessArrayResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import {
  ReportAnalyticsJobPostedCompletedResponseDto,
  ReportAnalyticsStatsResponseDto,
  ReportAnalyticsSubscriptionOverviewDto,
  ReportAnalyticsTopEmployeeItemDto,
  ReportAnalyticsTopEmployerItemDto,
  ReportAnalyticsTopSellerItemDto,
} from './dto/report-analytics-response.dto';

@ApiTags('Admin Report Analytics')
@Controller('admin/report-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class ReportAnalyticsController {
  constructor(
    private readonly reportAnalyticsService: ReportAnalyticsService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get report analytics stats cards (monthly growth)',
  })
  @ApiSuccessResponse(ReportAnalyticsStatsResponseDto, {
    description: 'Report analytics stats retrieved successfully',
  })
  async getStats() {
    const data = await this.reportAnalyticsService.getStats();
    return ResponseHelper.success(
      data,
      'Report analytics stats retrieved successfully',
    );
  }

  @Get('jobs-posted-vs-completed')
  @ApiOperation({
    summary: 'Get monthly jobs posted vs completed insights (no filters)',
  })
  @ApiSuccessResponse(ReportAnalyticsJobPostedCompletedResponseDto, {
    description: 'Jobs posted vs completed insights retrieved successfully',
  })
  async getJobsPostedVsCompleted() {
    const data = await this.reportAnalyticsService.getJobsPostedVsCompleted();
    return ResponseHelper.success(
      data,
      'Jobs posted vs completed insights retrieved successfully',
    );
  }

  @Get('subscription-overview')
  @ApiOperation({ summary: 'Get subscription overview distribution' })
  @ApiSuccessResponse(ReportAnalyticsSubscriptionOverviewDto, {
    description: 'Subscription overview retrieved successfully',
  })
  async getSubscriptionOverview() {
    const data = await this.reportAnalyticsService.getSubscriptionOverview();
    return ResponseHelper.success(
      data,
      'Subscription overview retrieved successfully',
    );
  }

  @Get('top-performing-employers')
  @ApiOperation({ summary: 'Get top performing employers' })
  @ApiSuccessArrayResponse(ReportAnalyticsTopEmployerItemDto, {
    description: 'Top performing employers retrieved successfully',
  })
  async getTopPerformingEmployers() {
    const data = await this.reportAnalyticsService.getTopPerformingEmployers();
    return ResponseHelper.success(
      data,
      'Top performing employers retrieved successfully',
    );
  }

  @Get('top-performing-employees')
  @ApiOperation({ summary: 'Get top performing employees' })
  @ApiSuccessArrayResponse(ReportAnalyticsTopEmployeeItemDto, {
    description: 'Top performing employees retrieved successfully',
  })
  async getTopPerformingEmployees() {
    const data = await this.reportAnalyticsService.getTopPerformingEmployees();
    return ResponseHelper.success(
      data,
      'Top performing employees retrieved successfully',
    );
  }

  @Get('top-sellers')
  @ApiOperation({ summary: 'Get top sellers report table' })
  @ApiSuccessArrayResponse(ReportAnalyticsTopSellerItemDto, {
    description: 'Top sellers report retrieved successfully',
  })
  async getTopSellers() {
    const data = await this.reportAnalyticsService.getTopSellers();
    return ResponseHelper.success(
      data,
      'Top sellers report retrieved successfully',
    );
  }
}
