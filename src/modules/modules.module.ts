import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateMessageModule } from './private-message/private-message.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DevToolsModule } from './dev-tools/dev-tools.module';
import { ProfileModule } from './profile/profile.module';

const devOnlyImports =
  process.env.NODE_ENV === 'development' ? [DevToolsModule] : [];

@Module({
  imports: [
    AuthModule,
    PrivateMessageModule,
    PrismaModule,
    ...devOnlyImports,
    ProfileModule,
  ],
})
export class ModulesModule {}
