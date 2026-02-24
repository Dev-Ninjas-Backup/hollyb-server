import { Module } from '@nestjs/common';
import { SubscriptionModule } from './subscription/subscription.module';
import { BackgroundCheckModule } from './background-check/background-check.module';
import { JobsModule } from './jobs/jobs.module';
import { SettingsModule } from './settings/settings.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [SubscriptionModule, BackgroundCheckModule, JobsModule, SettingsModule, OverviewModule],
})
export class AdminModule {}
