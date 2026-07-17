import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MessagesModule } from './modules/messages/messages.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public'), exclude: ['/api*'] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CustomersModule,
    PurchasesModule,
    TemplatesModule,
    WhatsappModule,
    SchedulerModule,
    MessagesModule,
    UsersModule,
    SettingsModule,
  ],
})
export class AppModule {}
