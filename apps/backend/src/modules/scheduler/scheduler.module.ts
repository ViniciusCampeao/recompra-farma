import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [ScheduleModule.forRoot(), WhatsappModule, TemplatesModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
