import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import { ResponseHelper } from '@/common/utils/response.helper';
import { EmployersService } from './employers.service';
import {
  AdminEmployerActivityQueryDto,
  AdminEmployerEngagementResponseDto,
  AdminEmployerJobTrendResponseDto,
  AdminEmployerRecentActivityItemDto,
  AdminEmployerStatsDto,
  AdminEmployerSubscriptionOverviewDto,
} from './dto';

@ApiTags('Admin Employers')
@Controller('admin/employers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class EmployersController {
  constructor(private readonly employersService: EmployersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get employer dashboard summary cards' })
  @ApiSuccessResponse(AdminEmployerStatsDto, {
    description: 'Employer stats retrieved successfully',
  })
  async getStats() {
    const data = await this.employersService.getStats();
    return ResponseHelper.success(
      data,
      'Employer stats retrieved successfully',
    );
  }

  @Get('insights/engagement')
  @ApiOperation({ summary: 'Get active vs inactive employers by week' })
  @ApiSuccessResponse(AdminEmployerEngagementResponseDto, {
    description: 'Employer engagement insights retrieved successfully',
  })
  async getEngagementInsights() {
    const data = await this.employersService.getEngagementInsights();
    return ResponseHelper.success(
      data,
      'Employer engagement insights retrieved successfully',
    );
  }

  @Get('insights/job-post-trends')
  @ApiOperation({ summary: 'Get employer job post trends for last 6 months' })
  @ApiSuccessResponse(AdminEmployerJobTrendResponseDto, {
    description: 'Employer job post trends retrieved successfully',
  })
  async getJobPostTrends() {
    const data = await this.employersService.getJobPostTrends();
    return ResponseHelper.success(
      data,
      'Employer job post trends retrieved successfully',
    );
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get recent employer activities with pagination' })
  @ApiPaginatedResponse(
    AdminEmployerRecentActivityItemDto,
    'Recent employer activities retrieved successfully',
  )
  async getRecentActivities(@Query() query: AdminEmployerActivityQueryDto) {
    const result = await this.employersService.getRecentActivities(query);
    return ResponseHelper.successWithPagination(
      result.items,
      result.meta,
      'Recent employer activities retrieved successfully',
    );
  }

  @Get('subscription-overview')
  @ApiOperation({ summary: 'Get employer subscription overview distribution' })
  @ApiSuccessResponse(AdminEmployerSubscriptionOverviewDto, {
    description: 'Employer subscription overview retrieved successfully',
  })
  async getSubscriptionOverview() {
    const data = await this.employersService.getSubscriptionOverview();
    return ResponseHelper.success(
      data,
      'Employer subscription overview retrieved successfully',
    );
  }
}
