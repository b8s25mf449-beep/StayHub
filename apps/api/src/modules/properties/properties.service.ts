import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Property } from './entities/property.entity';
import { RoomType } from './entities/room-type.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

const SEED_ROOM_TYPES = [
  { name: 'King',         maxOccupancy: 2, basePrice: 100 },
  { name: 'Doble',        maxOccupancy: 2, basePrice: 80  },
  { name: 'Triple',       maxOccupancy: 3, basePrice: 120 },
  { name: 'Jr Suite',     maxOccupancy: 2, basePrice: 150 },
  { name: 'Master Suite', maxOccupancy: 4, basePrice: 250 },
];

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property) private readonly repo: Repository<Property>,
    @InjectRepository(RoomType) private readonly rtRepo: Repository<RoomType>,
  ) {}

  async create(tenantId: string, dto: CreatePropertyDto): Promise<Property> {
    const property = this.repo.create({ ...dto, tenantId });
    const saved = await this.repo.save(property);

    // Auto-seed standard room types
    const seedTypes = SEED_ROOM_TYPES.map((t) =>
      this.rtRepo.create({ ...t, tenantId, propertyId: saved.id }),
    );
    await this.rtRepo.save(seedTypes);

    return saved;
  }

  async findAll(tenantId: string): Promise<Property[]> {
    return this.repo.find({ where: { tenantId, deletedAt: IsNull() } });
  }

  async findOne(tenantId: string, id: string): Promise<Property> {
    const property = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(tenantId: string, id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.findOne(tenantId, id);
    Object.assign(property, dto);
    return this.repo.save(property);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
