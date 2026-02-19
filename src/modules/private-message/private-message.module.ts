import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { PrivateMessageController } from './private-message.controller';
import { PrivateChatService } from './private-message.service';
import { PrivateChatGateway } from './private-message.gateway';
import { PrismaService } from '@/prisma/prisma.service';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [PrivateMessageController],
  providers: [
    PrivateChatService,
    PrivateChatGateway,
    PrismaService,
    SocketAuthMiddleware,
  ],
  exports: [PrivateChatService, PrivateChatGateway],
})
export class PrivateMessageModule {}
