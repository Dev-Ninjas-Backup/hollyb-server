import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProfileModule } from '@/modules/profile/profile.module';
import { DevToolsController } from './dev-tools.controller';
import { DevToolsService } from './dev-tools.service';

@Module({
  imports: [PrismaModule, JwtModule.register({}), ProfileModule],
  controllers: [DevToolsController],
  providers: [DevToolsService],
})
export class DevToolsModule {}
