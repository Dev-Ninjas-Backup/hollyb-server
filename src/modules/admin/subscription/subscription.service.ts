import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionPlanType } from '@prisma';
import { UpdateSubscriptionPricingDto } from './dto/update-subscription-pricing.dto';

type PricingView = {
	planType: SubscriptionPlanType;
	title: string;
	amount: string;
	billingCycle: 'monthly';
};

@Injectable()
export class SubscriptionService {
	private readonly settings = {
		[SubscriptionPlanType.employer_premium]: {
			key: 'subscription.pricing.employer_premium.monthly',
			title: 'Premium',
			fallbackAmount: '9.99',
		},
		[SubscriptionPlanType.employee_premium]: {
			key: 'subscription.pricing.employee_premium.monthly',
			title: 'Premium',
			fallbackAmount: '3.99',
		},
	} as const;

	constructor(private readonly prisma: PrismaService) {}

	async getPricing() {
		await this.ensurePricingSettings();

		const [employer, employee] = await Promise.all([
			this.prisma.client.systemSetting.findUnique({
				where: {
					key: this.settings[SubscriptionPlanType.employer_premium].key,
				},
			}),
			this.prisma.client.systemSetting.findUnique({
				where: {
					key: this.settings[SubscriptionPlanType.employee_premium].key,
				},
			}),
		]);

		return {
			employerPlan: this.toView(SubscriptionPlanType.employer_premium, employer?.value),
			employeePlan: this.toView(SubscriptionPlanType.employee_premium, employee?.value),
		};
	}

	async updatePricing(dto: UpdateSubscriptionPricingDto) {
		const setting = this.settings[dto.planType];
		const amount = dto.amount.toFixed(2);

		await this.prisma.client.systemSetting.upsert({
			where: { key: setting.key },
			create: {
				key: setting.key,
				value: amount,
				description: `${dto.planType} monthly subscription amount`,
			},
			update: {
				value: amount,
			},
		});

		return this.toView(dto.planType, amount);
	}

	private toView(planType: SubscriptionPlanType, amount?: string | null): PricingView {
		const setting = this.settings[planType];
		return {
			planType,
			title: setting.title,
			amount: amount || setting.fallbackAmount,
			billingCycle: 'monthly',
		};
	}

	private async ensurePricingSettings() {
		await Promise.all([
			this.prisma.client.systemSetting.upsert({
				where: {
					key: this.settings[SubscriptionPlanType.employer_premium].key,
				},
				create: {
					key: this.settings[SubscriptionPlanType.employer_premium].key,
					value: this.settings[SubscriptionPlanType.employer_premium].fallbackAmount,
					description: 'Employer premium monthly subscription amount',
				},
				update: {},
			}),
			this.prisma.client.systemSetting.upsert({
				where: {
					key: this.settings[SubscriptionPlanType.employee_premium].key,
				},
				create: {
					key: this.settings[SubscriptionPlanType.employee_premium].key,
					value: this.settings[SubscriptionPlanType.employee_premium].fallbackAmount,
					description: 'Employee premium monthly subscription amount',
				},
				update: {},
			}),
		]);
	}
}
