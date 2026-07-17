import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

class CreateUserDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(UserRole) @IsOptional() role?: UserRole;
}

class UpdateUserDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @MinLength(6) @IsOptional() password?: string;
  @IsEnum(UserRole) @IsOptional() role?: UserRole;
  @IsBoolean() @IsOptional() active?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email já cadastrado');

    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name || dto.email.split('@')[0],
        email: dto.email,
        password: hash,
        role: dto.role || UserRole.ATTENDANT,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
  }
}
