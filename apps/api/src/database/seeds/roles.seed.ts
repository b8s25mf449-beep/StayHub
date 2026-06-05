import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

import { Permission } from '../../modules/users/entities/permission.entity';
import { Role } from '../../modules/users/entities/role.entity';

const ALL_PERMISSIONS = [
  { name: 'reservations:read',  resource: 'reservations', action: 'read' },
  { name: 'reservations:write', resource: 'reservations', action: 'write' },
  { name: 'guests:read',        resource: 'guests',        action: 'read' },
  { name: 'guests:write',       resource: 'guests',        action: 'write' },
  { name: 'rooms:read',         resource: 'rooms',         action: 'read' },
  { name: 'rooms:write',        resource: 'rooms',         action: 'write' },
  { name: 'payments:read',      resource: 'payments',      action: 'read' },
  { name: 'payments:write',     resource: 'payments',      action: 'write' },
  { name: 'users:read',         resource: 'users',         action: 'read' },
  { name: 'users:write',        resource: 'users',         action: 'write' },
  { name: 'properties:read',    resource: 'properties',    action: 'read' },
  { name: 'properties:write',   resource: 'properties',    action: 'write' },
  { name: 'tenants:read',       resource: 'tenants',       action: 'read' },
  { name: 'tenants:write',      resource: 'tenants',       action: 'write' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.name),
  admin: [
    'reservations:read', 'reservations:write',
    'guests:read', 'guests:write',
    'rooms:read', 'rooms:write',
    'payments:read', 'payments:write',
    'users:read',
    'properties:read',
  ],
  usuario: [
    'reservations:read', 'reservations:write',
    'guests:read',
    'rooms:read',
    'payments:read',
  ],
};

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [Permission, Role],
    synchronize: false,
  });

  await ds.initialize();
  console.log('Connected to database');

  const permRepo = ds.getRepository(Permission);
  const roleRepo = ds.getRepository(Role);

  // 1. Upsert permissions
  for (const p of ALL_PERMISSIONS) {
    const exists = await permRepo.findOne({ where: { name: p.name } });
    if (!exists) {
      await permRepo.save(permRepo.create(p));
      console.log(`Created permission: ${p.name}`);
    }
  }

  // 2. Load all permissions by name map
  const allPerms = await permRepo.find();
  const permByName = Object.fromEntries(allPerms.map((p) => [p.name, p]));

  // 3. Upsert roles
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    let role = await roleRepo.findOne({
      where: { name: roleName, isSystem: true },
      relations: { permissions: true },
    });

    const rolePerms = permNames.map((n) => permByName[n]).filter(Boolean);

    if (!role) {
      role = roleRepo.create({
        name: roleName,
        description: roleName === 'super_admin'
          ? 'Acceso total al sistema'
          : roleName === 'admin'
          ? 'Gerente de propiedad'
          : 'Recepcionista',
        tenantId: null as unknown as string,
        isSystem: true,
        permissions: rolePerms,
      });
      await roleRepo.save(role);
      console.log(`Created role: ${roleName}`);
    } else {
      role.permissions = rolePerms;
      await roleRepo.save(role);
      console.log(`Updated role: ${roleName}`);
    }
  }

  await ds.destroy();
  console.log('Seed complete');
}

seed().catch((e) => { console.error(e); process.exit(1); });
