import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { ProfileDocumentsService } from './profile-documents.service';
import { ProfileController } from './profile.controller';
import { ProfileDocumentsController } from './profile-documents.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [ProfileService, ProfileDocumentsService, JwtAuthGuard],
  controllers: [ProfileController, ProfileDocumentsController],
})
export class ProfileModule {}
