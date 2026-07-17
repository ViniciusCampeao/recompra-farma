import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('phone') phone?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.messageLog.findMany({
      where: {
        ...(phone ? { phone: { contains: phone } } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit || '200'),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  }
}
