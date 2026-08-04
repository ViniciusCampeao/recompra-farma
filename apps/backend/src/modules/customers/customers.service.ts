import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw new ConflictException('Telefone inválido');

    const exists = await this.prisma.customer.findUnique({ where: { phone } });
    if (exists) throw new ConflictException('Cliente já cadastrado com este telefone');

    return this.prisma.customer.create({
      data: {
        phone,
        phoneRaw: dto.phone,
        name: dto.name,
        notes: dto.notes,
      },
    });
  }

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { phoneRaw: { contains: search } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { purchases: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          include: { reminderConfig: true },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.phone) {
      data.phone = normalizePhone(dto.phone);
      data.phoneRaw = dto.phone;
    }

    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }
}
