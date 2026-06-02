import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property) private readonly repo: Repository<Property>,
  ) {}

  async create(tenantId: string, dto: CreatePropertyDto): Promise<Property> {
    const property = this.repo.create({ ...dto, tenantId });
    return this.repo.save(property);
  }

  async findAll(tenantId: string): Promise<Property[]> {
    return this.repo.find({ where: { tenantId, deletedAt: null } });
  }

  async findOne(tenantId: string, id: string): Promise<Property> {
    const property = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
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
