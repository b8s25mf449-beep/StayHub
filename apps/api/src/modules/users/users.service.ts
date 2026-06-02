import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const roles = dto.roleIds?.length
      ? await this.roleRepo.find({ where: { id: In(dto.roleIds) } })
      : [];

    const user = this.userRepo.create({
      tenantId,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      phone: dto.phone,
      locale: dto.locale,
      timezone: dto.timezone,
      roles,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
    return this.userRepo.save(user);
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepo.find({ where: { tenantId, deletedAt: null } });
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(tenantId, id);
    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length
        ? await this.roleRepo.find({ where: { id: In(dto.roleIds) } })
        : [];
    }
    const { roleIds, ...rest } = dto;
    Object.assign(user, rest);
    return this.userRepo.save(user);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.userRepo.softDelete(id);
  }
}
