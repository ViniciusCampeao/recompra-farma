import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TemplatesService } from '../templates/templates.service';
import {
  ReminderStatus,
  ReminderType,
  MessageDirection,
  MessageOrigin,
  MessageStatus,
} from '@prisma/client';
import type { AppEnv } from '../../config/env.validation';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly templates: TemplatesService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.maxAttempts = config.get('REMINDER_MAX_ATTEMPTS', { infer: true });
  }

  /**
   * Tick do scheduler — roda a cada 2 minutos (configurável via env).
   * Busca reminders PENDING cuja scheduledFor <= agora e tenta enviar.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingReminders() {
    const now = new Date();

    const reminders = await this.prisma.scheduledReminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledFor: { lte: now },
      },
      include: {
        purchase: {
          include: {
            customer: true,
            reminderConfig: true,
          },
        },
      },
      take: 50, // processa em lotes
    });

    if (reminders.length === 0) return;

    this.logger.log(`Processando ${reminders.length} lembretes pendentes`);

    for (const reminder of reminders) {
      await this.processReminder(reminder);
    }
  }

  private async processReminder(reminder: any) {
    const { purchase } = reminder;
    const customer = purchase.customer;

    if (!customer?.phone) {
      this.logger.warn(`Reminder ${reminder.id}: cliente sem telefone, cancelando`);
      await this.prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: { status: ReminderStatus.CANCELLED, lastError: 'Cliente sem telefone' },
      });
      return;
    }

    try {
      // Busca template
      const template = await this.templates.getDefault(reminder.type as ReminderType);
      if (!template) {
        throw new Error(`Nenhum template default ativo para tipo ${reminder.type}`);
      }

      // Calcula dias restantes
      const endDate = new Date(purchase.estimatedEndDate);
      const diffMs = endDate.getTime() - Date.now();
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // Renderiza mensagem
      const body = this.templates.renderBody(template.body, {
        cliente: customer.name ?? undefined,
        medicamento: purchase.medicationName,
        dias: diasRestantes,
        data_fim: endDate.toLocaleDateString('pt-BR'),
      });

      // Envia via WhatsApp
      const result = await this.whatsapp.sendText(customer.phone, body);

      if (result.success) {
        // Cria log de mensagem
        const messageLog = await this.prisma.messageLog.create({
          data: {
            customerId: customer.id,
            purchaseId: purchase.id,
            phone: customer.phone,
            body,
            direction: MessageDirection.OUTBOUND,
            origin: MessageOrigin.SCHEDULED,
            status: MessageStatus.SENT,
            providerMessageId: result.messageId,
          },
        });

        // Atualiza reminder como enviado
        await this.prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.SENT,
            sentAt: new Date(),
            messageLogId: messageLog.id,
            attempts: reminder.attempts + 1,
          },
        });

        this.logger.log(
          `✅ Lembrete ${reminder.type} enviado para ${customer.phone} (${purchase.medicationName})`,
        );
      } else {
        throw new Error(result.error ?? 'Falha no envio');
      }
    } catch (err: any) {
      const attempts = reminder.attempts + 1;
      const failed = attempts >= this.maxAttempts;

      await this.prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          attempts,
          lastError: err.message,
          status: failed ? ReminderStatus.FAILED : ReminderStatus.PENDING,
        },
      });

      if (failed) {
        this.logger.error(
          `❌ Lembrete ${reminder.id} falhou após ${attempts} tentativas: ${err.message}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Lembrete ${reminder.id} tentativa ${attempts}/${this.maxAttempts}: ${err.message}`,
        );
      }
    }
  }
}
