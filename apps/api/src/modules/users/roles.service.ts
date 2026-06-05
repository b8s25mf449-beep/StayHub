import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  /** Returns assignable roles (system roles, excluding super_admin). */
  findAssignable(): Promise<Pick<Role, 'id' | 'name' | 'description'>[]> {
    return this.roleRepo
      .createQueryBuilder('role')
      .select(['role.id', 'role.name', 'role.description'])
      .where('role.is_system = true')
      .andWhere('role.name != :name', { name: 'super_admin' })
      .getMany();
  }
}
