import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
  @ApiErrorResponses()
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
  @ApiErrorResponses()
  async updatePricing(@Body() dto: UpdateSubscriptionPricingDto) {
    const updated = await this.subscriptionService.updatePricing(dto);
    return ResponseHelper.success(
      updated,
      'Subscription pricing updated successfully',
    );
  }
}
