import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
