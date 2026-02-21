import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { BackgroundCheckModule } from './background-check/background-check.module';

@Module({
  imports: [SubscriptionModule, BackgroundCheckModule],
})
export class AdminModule {}
