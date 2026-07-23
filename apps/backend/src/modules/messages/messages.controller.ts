import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../../common/utils/phone.util';

class SendMessageDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * Histórico de mensagens (INBOUND + OUTBOUND) de um telefone, ou todas.
   * Lê do MessageLog local — a fonte já normalizada (E.164), sem os JIDs @lid
   * opacos que o histórico do Evolution devolve.
   */
  @Get()
  async findAll(
    @Query('phone') phone?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.messageLog.findMany({
      where: {
        ...(phone ? { phone: normalizePhone(phone) } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit || '500'),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  /**
   * Lista de conversas: um item por telefone, com a última mensagem e a
   * contagem total. Ordenado da mais recente para a mais antiga.
   */
  @Get('conversations')
  async conversations() {
    // Agrupa por telefone no banco e busca a última mensagem de cada.
    const grouped = await this.prisma.messageLog.groupBy({
      by: ['phone'],
      _max: { createdAt: true },
      _count: { _all: true },
    });

    grouped.sort(
      (a, b) =>
        (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0),
    );

    return Promise.all(
      grouped.map(async (g) => {
        const last = await this.prisma.messageLog.findFirst({
          where: { phone: g.phone },
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        });
        return {
          phone: g.phone,
          count: g._count._all,
          name: last?.customer?.name ?? null,
          customerId: last?.customer?.id ?? null,
          lastBody: last?.body ?? '',
          lastDirection: last?.direction ?? 'OUTBOUND',
          lastAt: last?.createdAt ?? null,
        };
      }),
    );
  }

  /**
   * Envia uma mensagem manual e registra como OUTBOUND no MessageLog.
   * O envio real vai pela Evolution; o registro garante que a conversa
   * apareça unificada (mesma fonte da listagem), sem depender de webhook.
   */
  @Post('send')
  async send(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { id: string },
  ) {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw new BadRequestException('Número inválido');

    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Mensagem vazia');

    const result = await this.whatsapp.sendText(phone, text);

    const customer = await this.prisma.customer.findUnique({ where: { phone } });

    const log = await this.prisma.messageLog.create({
      data: {
        phone,
        body: text,
        direction: 'OUTBOUND',
        origin: 'MANUAL',
        status: result.success ? 'SENT' : 'FAILED',
        providerMessageId: result.messageId ?? null,
        error: result.success ? null : (result.error ?? null),
        customerId: customer?.id ?? null,
        sentById: user.id,
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Falha ao enviar mensagem');
    }

    return log;
  }

  /**
   * Apaga o histórico de conversas do banco (MessageLog). Usado antes de
   * desconectar a conta do WhatsApp, para não deixar conversas de um número
   * que não estará mais vinculado. Se `phone` for informado, apaga só daquele
   * contato; senão, apaga tudo.
   */
  @Delete()
  async wipe(@Query('phone') phone?: string) {
    const where = phone ? { phone: normalizePhone(phone) } : {};
    const { count } = await this.prisma.messageLog.deleteMany({ where });
    return { deleted: count };
  }
}
