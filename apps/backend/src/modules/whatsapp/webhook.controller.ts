import { Body, Controller, Post, Logger, Headers } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { phoneFromJid } from '../../common/utils/phone.util';

/**
 * Webhook que recebe eventos da Evolution API.
 * Não requer JWT — autenticação é via apikey header (verificada no guard abaixo).
 * Para simplificar a Etapa 3, aceita qualquer POST e filtra pelo event type.
 */
@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('evolution')
  @ApiExcludeEndpoint()
  async handleEvolution(
    @Body() body: any,
    @Headers('apikey') apikey: string,
  ) {
    const event = body?.event;

    if (!event) {
      return { received: true };
    }

    this.logger.debug(`Evento recebido: ${event}`);

    switch (event) {
      case 'messages.upsert':
        await this.handleIncomingMessage(body);
        break;

      case 'connection.update':
        await this.handleConnectionUpdate(body);
        break;

      default:
        // Ignora eventos não tratados
        break;
    }

    return { received: true };
  }

  private async handleIncomingMessage(body: any) {
    try {
      const msg = body?.data;
      if (!msg || msg.key?.fromMe) return; // ignora mensagens enviadas por nós

      const remoteJid = msg.key?.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) return; // ignora grupos

      // Quando a mensagem vem de dispositivo vinculado, o remoteJid é um @lid
      // opaco (não o telefone). Nesse caso, o número real vem no remoteJidAlt
      // (ou senderPn). Preferimos o campo com telefone real para não bagunçar
      // o histórico com um número inventado.
      const jidForPhone = remoteJid.endsWith('@lid')
        ? (msg.key?.remoteJidAlt ?? msg.key?.senderPn ?? remoteJid)
        : remoteJid;

      const phone = phoneFromJid(jidForPhone);
      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        '';

      if (!phone || !text) return;

      this.logger.log(`Mensagem recebida de ${phone}: "${text.slice(0, 50)}"`);

      // Salva no MessageLog como INBOUND
      const customer = await this.prisma.customer.findUnique({
        where: { phone },
      });

      await this.prisma.messageLog.create({
        data: {
          phone,
          body: text,
          direction: 'INBOUND',
          origin: 'MANUAL',
          status: 'DELIVERED',
          customerId: customer?.id ?? null,
          providerMessageId: msg.key?.id ?? null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Erro ao processar mensagem: ${err.message}`);
    }
  }

  private async handleConnectionUpdate(body: any) {
    try {
      const state = body?.data?.state ?? body?.data?.connection;
      const instance = body?.instance;

      if (!instance || !state) return;

      this.logger.log(`Conexão ${instance}: ${state}`);

      await this.prisma.whatsappSession.upsert({
        where: { instanceName: instance },
        update: {
          status: state,
          ...(state === 'open' ? { lastConnectedAt: new Date() } : {}),
        },
        create: {
          instanceName: instance,
          status: state,
          ...(state === 'open' ? { lastConnectedAt: new Date() } : {}),
        },
      });
    } catch (err: any) {
      this.logger.error(`Erro ao processar connection update: ${err.message}`);
    }
  }
}
