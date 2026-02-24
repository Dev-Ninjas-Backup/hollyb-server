import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma';
import { Roles } from '@/common/decorators/roles.decorator';


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
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ 
    name: 'period', 
    required: false, 
    enum: ['this_week', 'this_month', 'this_year'],
    description: 'Time period for statistics' 
  })
  getStatistics(@Query('period') period?: 'this_week' | 'this_month' | 'this_year') {
    return this.overviewService.getStatistics(period);
  }
}
