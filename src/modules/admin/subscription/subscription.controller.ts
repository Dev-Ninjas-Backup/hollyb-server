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

@ApiTags('Admin Subscription')
@Controller('admin/subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class SubscriptionController {
	constructor(private readonly subscriptionService: SubscriptionService) {}

	@Get('pricing')
	getPricing() {
		return this.subscriptionService.getPricing();
	}

	@Patch('pricing')
	updatePricing(@Body() dto: UpdateSubscriptionPricingDto) {
		return this.subscriptionService.updatePricing(dto);
	}
}
