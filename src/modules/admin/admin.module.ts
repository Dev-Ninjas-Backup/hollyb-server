import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { BackgroundCheckModule } from './background-check/background-check.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [SubscriptionModule, BackgroundCheckModule, JobsModule],
})
export class AdminModule {}
