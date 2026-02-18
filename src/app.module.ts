import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ModulesModule } from './modules/modules.module';
import { validationSchema } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => validationSchema.parse(config),
    }),
    PrismaModule,
    ModulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
