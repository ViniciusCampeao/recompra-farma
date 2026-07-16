import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';
import { ReminderType, ReminderStatus, PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula a data estimada de término do tratamento.
   * Prioridade: treatmentDays → ceil(quantity / dosePerDay) → null (erro)
   */
  private calcEndDate(
    purchaseDate: Date,
    treatmentDays?: number,
    quantity?: number,
    dosePerDay?: number,
  ): Date {
    let days: number;

    if (treatmentDays) {
      days = treatmentDays;
    } else if (quantity && dosePerDay && dosePerDay > 0) {
      days = Math.ceil(quantity / dosePerDay);
    } else {
      throw new BadRequestException(
        'Informe treatmentDays ou (quantity + dosePerDay) para calcular o término',
      );
    }

    const end = new Date(purchaseDate);
    end.setDate(end.getDate() + days);
    return end;
  }

  async create(dto: CreatePurchaseDto) {
    // Verifica se o cliente existe
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();
    const estimatedEndDate = this.calcEndDate(
      purchaseDate,
      dto.treatmentDays,
      dto.quantity,
      dto.dosePerDay,
    );

    const advanceEnabled = dto.advanceEnabled ?? true;
    const advanceDays = dto.advanceDays ?? 3;
    const finalDayEnabled = dto.finalDayEnabled ?? true;
    const sendHour = dto.sendHour ?? 10;
    const sendMinute = dto.sendMinute ?? 0;

    // Cria purchase + reminderConfig + scheduledReminders em uma transação
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          customerId: dto.customerId,
          medicationName: dto.medicationName,
          quantity: dto.quantity,
          unit: dto.unit,
          dosePerDay: dto.dosePerDay,
          treatmentDays: dto.treatmentDays,
          purchaseDate,
          estimatedEndDate,
          reminderConfig: {
            create: {
              advanceEnabled,
              advanceDays,
              finalDayEnabled,
              sendHour,
              sendMinute,
            },
          },
        },
        include: { reminderConfig: true },
      });

      // Cria os ScheduledReminders
      const reminders: Array<{
        purchaseId: string;
        type: ReminderType;
        scheduledFor: Date;
        status: ReminderStatus;
      }> = [];

      if (advanceEnabled) {
        const advanceDate = new Date(estimatedEndDate);
        advanceDate.setDate(advanceDate.getDate() - advanceDays);
        advanceDate.setHours(sendHour, sendMinute, 0, 0);

        if (advanceDate > new Date()) {
          reminders.push({
            purchaseId: purchase.id,
            type: ReminderType.ADVANCE,
            scheduledFor: advanceDate,
            status: ReminderStatus.PENDING,
          });
        }
      }

      if (finalDayEnabled) {
        const finalDate = new Date(estimatedEndDate);
        finalDate.setHours(sendHour, sendMinute, 0, 0);

        if (finalDate > new Date()) {
          reminders.push({
            purchaseId: purchase.id,
            type: ReminderType.FINAL_DAY,
            scheduledFor: finalDate,
            status: ReminderStatus.PENDING,
          });
        }
      }

      if (reminders.length > 0) {
        await tx.scheduledReminder.createMany({ data: reminders });
      }

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          reminderConfig: true,
          reminders: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      });
    });
  }

  async findAll(customerId?: string) {
    return this.prisma.purchase.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: { purchaseDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        reminderConfig: true,
        reminders: { orderBy: { scheduledFor: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        customer: true,
        reminderConfig: true,
        reminders: { orderBy: { scheduledFor: 'asc' } },
        messageLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!purchase) throw new NotFoundException('Compra não encontrada');
    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.medicationName) data.medicationName = dto.medicationName;
    if (dto.quantity) data.quantity = dto.quantity;
    if (dto.unit) data.unit = dto.unit;
    if (dto.dosePerDay !== undefined) data.dosePerDay = dto.dosePerDay;
    if (dto.treatmentDays !== undefined) data.treatmentDays = dto.treatmentDays;
    if (dto.status) data.status = dto.status as PurchaseStatus;

    return this.prisma.purchase.update({
      where: { id },
      data,
      include: { reminderConfig: true, reminders: true },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Cancela reminders pendentes
      await tx.scheduledReminder.updateMany({
        where: { purchaseId: id, status: ReminderStatus.PENDING },
        data: { status: ReminderStatus.CANCELLED },
      });

      return tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.CANCELLED },
        include: { reminderConfig: true, reminders: true },
      });
    });
  }
}
