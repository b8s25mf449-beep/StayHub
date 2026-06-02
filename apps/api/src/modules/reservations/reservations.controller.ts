import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('v1/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create reservation (checks availability)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReservationDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reservation / change status' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reservation' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
