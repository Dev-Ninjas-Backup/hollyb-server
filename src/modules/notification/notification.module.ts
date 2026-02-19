import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from '@/prisma/prisma.service';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: 'NotificationService',
      useClass: NotificationService,
    },
    {
      provide: 'NotificationGateway',
      useClass: NotificationGateway,
    },
    NotificationService,
    NotificationGateway,
    PrismaService,
    SocketAuthMiddleware,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
