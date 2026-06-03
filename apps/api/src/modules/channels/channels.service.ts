import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ChannelConnection } from './entities/channel-connection.entity';
import { Room } from '../properties/entities/room.entity';
import { CreateChannelConnectionDto } from './dto/create-channel-connection.dto';
import { UpdateChannelConnectionDto } from './dto/update-channel-connection.dto';
import { ICalImportService, SyncResult } from './ical-import.service';

@Injectable()
export class ChannelConnectionsService {
  constructor(
    @InjectRepository(ChannelConnection)
    private readonly repo: Repository<ChannelConnection>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    private readonly icalImportService: ICalImportService,
  ) {}

  async create(tenantId: string, dto: CreateChannelConnectionDto): Promise<ChannelConnection> {
    const room = await this.roomRepo.findOne({
      where: { id: dto.roomId, tenantId, propertyId: dto.propertyId, deletedAt: IsNull() },
    });
    if (!room) throw new ForbiddenException('Room not found in this tenant/property');

    const connection = this.repo.create({ ...dto, tenantId });
    return this.repo.save(connection);
  }

  async findAll(
    tenantId: string,
    propertyId?: string,
    roomId?: string,
  ): Promise<Omit<ChannelConnection, 'icalUrl'>[]> {
    const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    if (propertyId) where.propertyId = propertyId;
    if (roomId) where.roomId = roomId;
    const connections = await this.repo.find({ where: where as any });
    return connections.map(({ icalUrl, ...rest }) => rest as Omit<ChannelConnection, 'icalUrl'>);
  }

  async findOne(tenantId: string, id: string): Promise<ChannelConnection> {
    const connection = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!connection) throw new NotFoundException('Channel connection not found');
    return connection;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateChannelConnectionDto,
  ): Promise<ChannelConnection> {
    const connection = await this.findOne(tenantId, id);
    Object.assign(connection, dto);
    return this.repo.save(connection);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }

  async sync(tenantId: string, id: string): Promise<SyncResult> {
    const connection = await this.findOne(tenantId, id);
    return this.icalImportService.importFromConnection(connection);
  }
}
