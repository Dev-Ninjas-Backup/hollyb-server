import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { EmployerService } from './employer.service';
import { EmployerController } from './employer.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, JwtModule.register({}), SubscriptionModule],
  controllers: [EmployerController],
  providers: [EmployerService, JwtAuthGuard],
})
export class EmployerModule {}
