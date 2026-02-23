import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployyeJobsApplyController } from './employye-jobs-apply.controller';
import { EmployeeJobsApplyService } from './employee-jobs-apply.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, JwtModule.register({}), SubscriptionModule],
  providers: [
    EmployeeService,
    EmployeeJobsApplyService,
    JwtAuthGuard,
    RolesGuard,
  ],
  controllers: [EmployyeJobsApplyController, EmployeeController],
})
export class EmployeeModule {}
