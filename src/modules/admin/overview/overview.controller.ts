import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseHelper } from '@/common/utils/response.helper';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import { OverviewRecentActivityQueryDto } from './dto/overview-recent-activity-query.dto';
import { OverviewRecentActivityItemDto } from './dto/overview-recent-activity-response.dto';
import { OverviewSystemHealthResponseDto } from './dto/overview-system-health-response.dto';

@ApiTags('Admin Overview')
@Controller('admin/overview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get an overview of job statistics' })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  getOverview() {
    return this.overviewService.getOverview();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get statistics by time period' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['this_week', 'this_month', 'this_year'],
    description: 'Time period for statistics',
  })
  getStatistics(
    @Query('period') period?: 'this_week' | 'this_month' | 'this_year',
  ) {
    return this.overviewService.getStatistics(period);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Get system health cards for admin overview' })
  @ApiSuccessResponse(OverviewSystemHealthResponseDto, {
    description: 'System health retrieved successfully',
  })
  async getSystemHealth() {
    const data = await this.overviewService.getSystemHealth();
    return ResponseHelper.success(data, 'System health retrieved successfully');
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get merged recent activity for admin overview' })
  @ApiPaginatedResponse(
    OverviewRecentActivityItemDto,
    'Recent activity retrieved successfully',
  )
  async getRecentActivity(@Query() query: OverviewRecentActivityQueryDto) {
    const result = await this.overviewService.getRecentActivity(query);
    return ResponseHelper.successWithPagination(
      result.items,
      result.meta,
      'Recent activity retrieved successfully',
    );
  }
}
