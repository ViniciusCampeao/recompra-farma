import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderType } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ example: 'custom_advance_1' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Aviso antecipado personalizado' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ReminderType })
  @IsEnum(ReminderType)
  @IsOptional()
  type?: ReminderType;

  @ApiProperty({ example: 'Olá {{cliente}}, seu {{medicamento}} acaba em {{dias}} dias.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
