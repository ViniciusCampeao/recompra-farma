import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Post('send-test')
  sendTest(
    @Body() body: { customerId: string; message: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.sendTest(body.customerId, body.message, user.id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('customerId') customerId?: string) {
    return this.service.findAll(customerId);
  }

  /** Lembretes agendados para hoje (pendentes + já enviados). */
  @Get('reminders/today')
  remindersToday() {
    return this.service.remindersToday();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
