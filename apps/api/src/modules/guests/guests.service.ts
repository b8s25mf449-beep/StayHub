import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Guest } from './entities/guest.entity';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private readonly repo: Repository<Guest>,
  ) {}

  async create(tenantId: string, dto: CreateGuestDto): Promise<Guest> {
    const { documentNumber, dateOfBirth, ...rest } = dto;
    const guest = this.repo.create({
      ...rest,
      tenantId,
      documentNumberEncrypted: documentNumber,
      dateOfBirthEncrypted: dateOfBirth,
    });
    return this.repo.save(guest);
  }

  async findAll(tenantId: string, search?: string): Promise<Guest[]> {
    if (search) {
      return this.repo.find({
        where: [
          { tenantId, firstName: ILike(`%${search}%`), deletedAt: null },
          { tenantId, lastName: ILike(`%${search}%`), deletedAt: null },
          { tenantId, email: ILike(`%${search}%`), deletedAt: null },
        ],
      });
    }
    return this.repo.find({ where: { tenantId, deletedAt: null } });
  }

  async findOne(tenantId: string, id: string): Promise<Guest> {
    const guest = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async update(tenantId: string, id: string, dto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.findOne(tenantId, id);
    const { documentNumber, dateOfBirth, ...rest } = dto;
    if (documentNumber !== undefined) guest.documentNumberEncrypted = documentNumber;
    if (dateOfBirth !== undefined) guest.dateOfBirthEncrypted = dateOfBirth;
    Object.assign(guest, rest);
    return this.repo.save(guest);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
