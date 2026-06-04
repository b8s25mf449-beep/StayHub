import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, ParseUUIDPipe, NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';
import { PricingService } from './pricing.service';
import { RoomRate } from './entities/room-rate.entity';
import { Room } from '../properties/entities/room.entity';
import { RoomType } from '../properties/entities/room-type.entity';
import { CreateRoomRateDto } from './dto/create-room-rate.dto';
import { UpdateRoomRateDto } from './dto/update-room-rate.dto';

@ApiTags('rates')
@Controller('v1/rates')
export class RatesController {
  constructor(
    private readonly pricingService: PricingService,
    @InjectRepository(RoomRate) private readonly repo: Repository<RoomRate>,
    @InjectRepository(Room) private readonly roomsRepo: Repository<Room>,
    @InjectRepository(RoomType) private readonly roomTypesRepo: Repository<RoomType>,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomRateDto) {
    if (dto.roomId) {
      const room = await this.roomsRepo.findOne({
        where: { id: dto.roomId, tenantId: user.tenantId, deletedAt: IsNull() },
      });
      if (!room) throw new NotFoundException('Room not found');
    }
    if (dto.roomTypeId) {
      const roomType = await this.roomTypesRepo.findOne({
        where: { id: dto.roomTypeId, tenantId: user.tenantId, deletedAt: IsNull() },
      });
      if (!roomType) throw new NotFoundException('Room type not found');
    }
    const rate = this.repo.create({ ...dto, tenantId: user.tenantId });
    return this.repo.save(rate);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('roomId') roomId?: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    const where: any = { tenantId: user.tenantId, deletedAt: IsNull() };
    if (roomId) where.roomId = roomId;
    if (roomTypeId) where.roomTypeId = roomTypeId;
    return this.repo.find({ where, order: { priority: 'DESC', createdAt: 'ASC' } });
  }

  @Get('room/:roomId/calculate')
  calculateStay(
    @CurrentUser() user: JwtPayload,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.pricingService.calculateStay(user.tenantId, roomId, checkIn, checkOut);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const rate = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, deletedAt: IsNull() },
    });
    if (!rate) throw new NotFoundException('Rate not found');
    return rate;
  }

  @Put(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomRateDto,
  ) {
    const rate = await this.findOne(user, id);
    Object.assign(rate, dto);
    return this.repo.save(rate);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const rate = await this.findOne(user, id);
    await this.repo.softDelete(rate.id);
  }
}
