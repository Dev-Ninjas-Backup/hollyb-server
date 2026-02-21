import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { BackgroundCheckController } from './background-check.controller';
import { BackgroundCheckService } from './background-check.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [BackgroundCheckController],
  providers: [BackgroundCheckService, JwtAuthGuard, RolesGuard],
})
export class BackgroundCheckModule {}
