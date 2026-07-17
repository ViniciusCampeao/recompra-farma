import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [MessagesController],
})
export class MessagesModule {}
