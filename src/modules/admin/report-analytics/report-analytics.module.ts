import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReportAnalyticsController } from './report-analytics.controller';
import { ReportAnalyticsService } from './report-analytics.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [ReportAnalyticsController],
  providers: [ReportAnalyticsService, JwtAuthGuard, RolesGuard],
})
export class ReportAnalyticsModule {}
