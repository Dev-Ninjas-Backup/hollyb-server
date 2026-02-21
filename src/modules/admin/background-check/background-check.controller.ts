import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma';
import {
  ApiPaginatedResponse,
  ApiSuccessArrayResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import { ResponseHelper } from '@/common/utils/response.helper';
import { BackgroundCheckService } from './background-check.service';
import { AdminBackgroundCheckQueryDto } from './dto/admin-background-check-query.dto';
import {
  AdminBackgroundCheckDetailDto,
  AdminBackgroundCheckListItemDto,
  AdminBackgroundCheckRecentActivityDto,
  AdminBackgroundCheckStatsDto,
} from './dto/background-check-response.dto';

@ApiTags('Admin Background Checks')
@Controller('background-checks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class BackgroundCheckController {
  constructor(
    private readonly backgroundCheckService: BackgroundCheckService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get background check summary stats' })
  @ApiSuccessResponse(AdminBackgroundCheckStatsDto, {
    description: 'Background check stats retrieved successfully',
  })
  async getStats() {
    const data = await this.backgroundCheckService.getStats();
    return ResponseHelper.success(
      data,
      'Background check stats retrieved successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get background checks list with filters' })
  @ApiPaginatedResponse(
    AdminBackgroundCheckListItemDto,
    'Background checks retrieved successfully',
  )
  async getBackgroundChecks(@Query() query: AdminBackgroundCheckQueryDto) {
    const result = await this.backgroundCheckService.getBackgroundChecks(query);
    return ResponseHelper.successWithPagination(
      result.items,
      result.meta,
      'Background checks retrieved successfully',
    );
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent background check activity' })
  @ApiSuccessArrayResponse(AdminBackgroundCheckRecentActivityDto, {
    description: 'Recent background check activity retrieved successfully',
  })
  async getRecentActivities(@Query() query: AdminBackgroundCheckQueryDto) {
    const data = await this.backgroundCheckService.getRecentActivities(query);
    return ResponseHelper.success(
      data,
      'Recent background check activity retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get background check details by user id' })
  @ApiSuccessResponse(AdminBackgroundCheckDetailDto, {
    description: 'Background check details retrieved successfully',
  })
  async getBackgroundCheckDetail(@Param('id') id: string) {
    const data = await this.backgroundCheckService.getBackgroundCheckDetail(id);
    return ResponseHelper.success(
      data,
      'Background check details retrieved successfully',
    );
  }
}
