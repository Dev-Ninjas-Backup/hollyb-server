import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, JwtAuthGuard],
})
export class SubscriptionModule {}
