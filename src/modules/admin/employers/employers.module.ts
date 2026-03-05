import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { EmployersController } from './employers.controller';
import { EmployersService } from './employers.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [EmployersController],
  providers: [EmployersService, JwtAuthGuard, RolesGuard],
})
export class EmployersModule {}
