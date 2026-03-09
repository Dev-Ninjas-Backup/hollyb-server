import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateMessageModule } from './private-message/private-message.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DevToolsModule } from './dev-tools/dev-tools.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationModule } from './notification/notification.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { EmployerModule } from './employer/employer.module';
import { EmployeeModule } from './employee/employee.module';

// const devOnlyImports =
//   process.env.NODE_ENV === 'development' ? [DevToolsModule] : [];

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    // ...devOnlyImports,
    DevToolsModule,
    ProfileModule,
    PrivateMessageModule,
    NotificationModule,
    SubscriptionModule,
    AdminModule,
    EmployerModule,
    EmployeeModule
  ],
})
export class ModulesModule {}
