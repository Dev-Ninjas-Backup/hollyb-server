import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [ProfileService, JwtAuthGuard],
  controllers: [ProfileController],
})
export class ProfileModule {}
