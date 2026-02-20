import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { EmployerService } from './employer.service';
import { EmployerController } from './employer.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [EmployerController],
  providers: [EmployerService, JwtAuthGuard],
})
export class EmployerModule {}
