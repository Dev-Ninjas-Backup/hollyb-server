import { Module } from '@nestjs/common';

import { PrivateMessageController } from './private-message.controller';
import { PrivateChatService } from './private-message.service';
import { PrivateChatGateway } from './private-message.gateway';
import { PrismaService } from '@/prisma/prisma.service';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

@Module({
  controllers: [PrivateMessageController],
  providers: [
    PrivateChatService,
    PrivateChatGateway,
    PrismaService,
    SocketAuthMiddleware,
  ],
})
export class PrivateMessageModule {}
