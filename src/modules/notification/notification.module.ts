import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
// import { JobNotificationScheduler } from './job-notification.scheduler';
import { PrismaService } from '@/prisma/prisma.service';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

/**
 * IMPORTANT: To enable job start time notifications (30 minutes before):
 * 1. Install @nestjs/schedule: pnpm install @nestjs/schedule
 * 2. Uncomment the ScheduleModule.forRoot() import
 * 3. Uncomment JobNotificationScheduler in providers
 * 
 * The scheduler will check every 5 minutes for jobs starting within 30 minutes
 * and send notifications to assigned employees via socket.io
 */
@Module({
  imports: [
    JwtModule.register({}), 
    ConfigModule,
    // ScheduleModule.forRoot(), // Uncomment after installing @nestjs/schedule
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    // JobNotificationScheduler, // Uncomment after installing @nestjs/schedule
    PrismaService,
    SocketAuthMiddleware,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
