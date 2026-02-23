import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { BackgroundCheckModule } from './background-check/background-check.module';
import { JobsModule } from './jobs/jobs.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [SubscriptionModule, BackgroundCheckModule, JobsModule, SettingsModule],
})
export class AdminModule {}
