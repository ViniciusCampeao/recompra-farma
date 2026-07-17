import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { EvolutionController } from './evolution.controller';

@Module({
  controllers: [WebhookController, EvolutionController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
