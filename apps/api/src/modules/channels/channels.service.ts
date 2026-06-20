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
    const saved = await this.repo.save(connection);

    // Auto-sync immediately so reservations appear right after the connection is configured
    this.icalImportService.importFromConnection(saved).catch(() => { /* errors stored in lastError */ });

    return saved;
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

  async syncAll(tenantId: string): Promise<Record<string, SyncResult | { error: string }>> {
    const connections = await this.repo.find({
      where: { tenantId, deletedAt: IsNull() },
    });

    const results = await Promise.allSettled(
      connections.map((c) => this.icalImportService.importFromConnection(c)),
    );

    const out: Record<string, SyncResult | { error: string }> = {};
    connections.forEach((c, i) => {
      const r = results[i];
      out[c.id] = r.status === 'fulfilled'
        ? r.value
        : { error: (r.reason as Error)?.message ?? 'Unknown error' };
    });
    return out;
  }

  async previewConnection(tenantId: string, id: string) {
    const connection = await this.findOne(tenantId, id);
    return this.icalImportService.previewConnection(connection);
  }

  async syncAllTenants(): Promise<{ total: number; synced: number; errors: number }> {
    const connections = await this.repo.find({ where: { deletedAt: IsNull() } });

    const results = await Promise.allSettled(
      connections.map((c) => this.icalImportService.importFromConnection(c)),
    );

    const errors = results.filter((r) => r.status === 'rejected').length;
    return { total: connections.length, synced: connections.length - errors, errors };
  }
}
