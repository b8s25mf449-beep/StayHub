import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RoomType } from '../entities/room-type.entity';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType) private readonly repo: Repository<RoomType>,
  ) {}

  async create(tenantId: string, dto: CreateRoomTypeDto): Promise<RoomType> {
    const rt = this.repo.create({ ...dto, tenantId });
    return this.repo.save(rt);
  }

  async findAll(tenantId: string, propertyId?: string): Promise<RoomType[]> {
    const where: any = { tenantId, deletedAt: IsNull() };
    if (propertyId) where.propertyId = propertyId;
    return this.repo.find({ where });
  }

  async findOne(tenantId: string, id: string): Promise<RoomType> {
    const rt = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!rt) throw new NotFoundException('Room type not found');
    return rt;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomTypeDto): Promise<RoomType> {
    const rt = await this.findOne(tenantId, id);
    Object.assign(rt, dto);
    return this.repo.save(rt);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
