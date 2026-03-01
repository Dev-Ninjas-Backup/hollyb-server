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
import { EmployeesService } from './employees.service';
import {
  AdminEmployeeActivityQueryDto,
  AdminEmployeeEngagementResponseDto,
  AdminEmployeeGrowthResponseDto,
  AdminEmployeeRecentActivityItemDto,
  AdminEmployeeStatsDto,
} from './dto';

@ApiTags('Admin Employees')
@Controller('admin/employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get employee dashboard summary cards' })
  @ApiSuccessResponse(AdminEmployeeStatsDto, {
    description: 'Employee stats retrieved successfully',
  })
  async getStats() {
    const data = await this.employeesService.getStats();
    return ResponseHelper.success(
      data,
      'Employee stats retrieved successfully',
    );
  }

  @Get('insights/growth')
  @ApiOperation({ summary: 'Get employee growth for last 6 months' })
  @ApiSuccessResponse(AdminEmployeeGrowthResponseDto, {
    description: 'Employee growth insights retrieved successfully',
  })
  async getGrowthInsights() {
    const data = await this.employeesService.getGrowthInsights();
    return ResponseHelper.success(
      data,
      'Employee growth insights retrieved successfully',
    );
  }

  @Get('insights/engagement')
  @ApiOperation({ summary: 'Get active vs inactive employees by week' })
  @ApiSuccessResponse(AdminEmployeeEngagementResponseDto, {
    description: 'Employee engagement insights retrieved successfully',
  })
  async getEngagementInsights() {
    const data = await this.employeesService.getEngagementInsights();
    return ResponseHelper.success(
      data,
      'Employee engagement insights retrieved successfully',
    );
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get recent employee activities with pagination' })
  @ApiPaginatedResponse(
    AdminEmployeeRecentActivityItemDto,
    'Recent employee activities retrieved successfully',
  )
  async getRecentActivities(@Query() query: AdminEmployeeActivityQueryDto) {
    const result = await this.employeesService.getRecentActivities(query);
    return ResponseHelper.successWithPagination(
      result.items,
      result.meta,
      'Recent employee activities retrieved successfully',
    );
  }
}
