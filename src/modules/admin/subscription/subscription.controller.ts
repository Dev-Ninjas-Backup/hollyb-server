import {
    Body,
    Controller,
    Get,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';
import { SubscriptionService } from './subscription.service';
import { ApiSuccessResponse } from '@/common/decorators/api-response.decorator';
import { ResponseHelper } from '@/common/utils/response.helper';

@ApiTags('Admin Subscription')
@Controller('admin/subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Get('pricing')
    async getPricing() {
        const price = await this.subscriptionService.getPricing();
        return ResponseHelper.success(price, 'Subscription pricing retrieved successfully');
    }

    @Patch('pricing')
    async updatePricing(@Body() dto: UpdateSubscriptionPricingDto) {
        const updated = await this.subscriptionService.updatePricing(dto);
        return ResponseHelper.success(updated, 'Subscription pricing updated successfully');
    }
}
