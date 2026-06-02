import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Record payment' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiQuery({ name: 'reservationId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('reservationId') reservationId?: string) {
    return this.service.findAll(user.tenantId, reservationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment status' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete payment' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
