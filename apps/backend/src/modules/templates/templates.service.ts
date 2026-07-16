import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';
import { ReminderType } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({ data: dto });
  }

  findAll() {
    return this.prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tpl = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template não encontrado');
    return tpl;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.messageTemplate.delete({ where: { id } });
  }

  /** Busca o template default para um tipo de lembrete */
  async getDefault(type: ReminderType) {
    return this.prisma.messageTemplate.findFirst({
      where: { type, isDefault: true, active: true },
    });
  }

  /**
   * Renderiza variáveis no body do template.
   * Variáveis suportadas: {{cliente}}, {{medicamento}}, {{dias}}, {{data_fim}}
   * Suporte a bloco condicional: {{#cliente}} ... {{/cliente}}
   */
  renderBody(
    body: string,
    vars: { cliente?: string; medicamento?: string; dias?: number; data_fim?: string },
  ): string {
    let result = body;

    // Blocos condicionais: {{#var}}conteudo{{/var}}
    result = result.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, key: string, content: string) => {
        const val = vars[key as keyof typeof vars];
        return val !== undefined && val !== null && val !== '' ? content : '';
      },
    );

    // Variáveis simples
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const val = vars[key as keyof typeof vars];
      return val !== undefined && val !== null ? String(val) : '';
    });

    return result.trim();
  }
}
