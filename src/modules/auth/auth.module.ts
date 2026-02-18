import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
