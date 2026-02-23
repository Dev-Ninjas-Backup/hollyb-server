import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [EmployeeService, JwtAuthGuard, RolesGuard],
  controllers: [EmployeeController],
})
export class EmployeeModule {}
