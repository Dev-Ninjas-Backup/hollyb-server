import {
	Body,
	Controller,
	Get,
	Patch,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
	AuthenticatedRequest,
	JwtAuthGuard,
} from '@/common/guards/jwt-auth.guard';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Admin Subscription')
@Controller('admin/subscription')
export class SubscriptionController {
	constructor(private readonly subscriptionService: SubscriptionService) {}

	@Get('pricing')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	getPricing(@Req() req: AuthenticatedRequest) {
		return this.subscriptionService.getPricing(req.user.role);
	}

	@Patch('pricing')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	updatePricing(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateSubscriptionPricingDto,
	) {
		return this.subscriptionService.updatePricing(req.user.role, dto);
	}
}
