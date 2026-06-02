import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Room } from '../entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly repo: Repository<Room>,
  ) {}

  async create(tenantId: string, dto: CreateRoomDto): Promise<Room> {
    const room = this.repo.create({ ...dto, tenantId });
    return this.repo.save(room);
  }

  async findAll(tenantId: string, propertyId?: string): Promise<Room[]> {
    const where: any = { tenantId, deletedAt: IsNull() };
    if (propertyId) where.propertyId = propertyId;
    return this.repo.find({ where });
  }

  async findOne(tenantId: string, id: string): Promise<Room> {
    const room = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(tenantId, id);
    Object.assign(room, dto);
    return this.repo.save(room);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
