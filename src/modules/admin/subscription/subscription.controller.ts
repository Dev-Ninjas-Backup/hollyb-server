import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';
import { SubscriptionService } from './subscription.service';
import {
  ApiErrorResponses,
  ApiSuccessResponse,
} from '@/common/decorators/api-response.decorator';
import { ResponseHelper } from '@/common/utils/response.helper';
import {
  SubscriptionPricingPlanDto,
  SubscriptionPricingResponseDto,
} from './dto/subscription-pricing-response.dto';
import {
  AdminSubscriptionActivityItemDto,
  AdminSubscriptionListItemDto,
  AdminSubscriptionSummaryResponseDto,
} from './dto/subscription-dashboard-response.dto';
import { AdminSubscriptionQueryDto } from './dto/admin-subscription-query.dto';
import {
  ApiPaginatedResponse,
  ApiSuccessArrayResponse,
} from '@/common/decorators/api-response.decorator';

@ApiTags('Admin Subscription')
@Controller('admin/subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get subscription pricing for all plans' })
  @ApiSuccessResponse(SubscriptionPricingResponseDto, {
    description: 'Subscription pricing retrieved successfully',
  })
  async getPricing() {
    const price = await this.subscriptionService.getPricing();
    return ResponseHelper.success(
      price,
      'Subscription pricing retrieved successfully',
    );
  }

  @Patch('pricing')
  @ApiOperation({ summary: 'Update subscription pricing by plan type' })
  @ApiSuccessResponse(SubscriptionPricingPlanDto, {
    description: 'Subscription pricing updated successfully',
  })
  async updatePricing(@Body() dto: UpdateSubscriptionPricingDto) {
    const updated = await this.subscriptionService.updatePricing(dto);
    return ResponseHelper.success(
      updated,
      'Subscription pricing updated successfully',
    );
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Get subscriptions list with filters for admin dashboard',
  })
  @ApiPaginatedResponse(
    AdminSubscriptionListItemDto,
    'Subscriptions retrieved successfully',
  )
  async getSubscriptions(@Query() query: AdminSubscriptionQueryDto) {
    const result = await this.subscriptionService.getSubscriptions(query);
    return ResponseHelper.successWithPagination(
      result.items,
      result.meta,
      'Subscriptions retrieved successfully',
    );
  }

  @Get('activities')
  @ApiOperation({
    summary: 'Get recent subscription activities for admin dashboard',
  })
  @ApiSuccessArrayResponse(AdminSubscriptionActivityItemDto, {
    description: 'Recent subscription activities retrieved successfully',
  })
  async getRecentActivities(@Query() query: AdminSubscriptionQueryDto) {
    const rows = await this.subscriptionService.getRecentActivities(query);
    return ResponseHelper.success(
      rows,
      'Recent subscription activities retrieved successfully',
    );
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get subscription summary and revenue trend for admin dashboard',
  })
  @ApiSuccessResponse(AdminSubscriptionSummaryResponseDto, {
    description: 'Subscription summary retrieved successfully',
  })
  async getSummary(@Query() query: AdminSubscriptionQueryDto) {
    const summary = await this.subscriptionService.getSummary(query);
    return ResponseHelper.success(
      summary,
      'Subscription summary retrieved successfully',
    );
  }
}
