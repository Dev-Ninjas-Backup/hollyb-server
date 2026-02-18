import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateMessageModule } from './private-message/private-message.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrivateMessageModule, PrismaModule],
})
export class ModulesModule {}
