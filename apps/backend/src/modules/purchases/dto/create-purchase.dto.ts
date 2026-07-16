import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'Losartana 50mg' })
  @IsString()
  medicationName: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'comprimidos' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 1, description: 'Dose por dia' })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  dosePerDay?: number;

  @ApiPropertyOptional({ example: 30, description: 'Dias de tratamento (prioridade sobre dosePerDay)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  treatmentDays?: number;

  @ApiPropertyOptional({ description: 'Data da compra (ISO). Default = hoje.' })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  // ---- Config de lembrete inline ----

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  advanceEnabled?: boolean;

  @ApiPropertyOptional({ default: 3 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30)
  advanceDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  finalDayEnabled?: boolean;

  @ApiPropertyOptional({ default: 10, description: 'Hora do disparo (0-23)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(23)
  sendHour?: number;

  @ApiPropertyOptional({ default: 0, description: 'Minuto do disparo (0-59)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(59)
  sendMinute?: number;
}

export class UpdatePurchaseDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  medicationName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  dosePerDay?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  treatmentDays?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
