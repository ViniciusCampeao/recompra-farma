import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface SettingsDto {
  defaultSendHour?: number;
  defaultSendMinute?: number;
}

const DEFAULTS: SettingsDto = { defaultSendHour: 10, defaultSendMinute: 0 };

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const rows = await this.prisma.appSettings.findMany();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return {
      defaultSendHour: map['defaultSendHour'] !== undefined ? parseInt(map['defaultSendHour']) : DEFAULTS.defaultSendHour,
      defaultSendMinute: map['defaultSendMinute'] !== undefined ? parseInt(map['defaultSendMinute']) : DEFAULTS.defaultSendMinute,
    };
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(@Body() dto: SettingsDto) {
    const ops = [];
    if (dto.defaultSendHour !== undefined) {
      ops.push(this.prisma.appSettings.upsert({
        where: { key: 'defaultSendHour' },
        update: { value: String(dto.defaultSendHour) },
        create: { key: 'defaultSendHour', value: String(dto.defaultSendHour) },
      }));
    }
    if (dto.defaultSendMinute !== undefined) {
      ops.push(this.prisma.appSettings.upsert({
        where: { key: 'defaultSendMinute' },
        update: { value: String(dto.defaultSendMinute) },
        create: { key: 'defaultSendMinute', value: String(dto.defaultSendMinute) },
      }));
    }
    await Promise.all(ops);
    return this.get();
  }
}
