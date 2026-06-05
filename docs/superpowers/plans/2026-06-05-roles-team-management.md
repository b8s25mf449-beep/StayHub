# Roles & Team Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a super_admin-only `/settings/team` page for creating users and assigning fixed roles (admin, usuario), backed by a seeded permissions system and guarded NestJS API endpoints.

**Architecture:** Three fixed system roles (`super_admin`, `admin`, `usuario`) seeded with `tenantId = NULL, isSystem = true`. A new `RoleGuard` is applied locally to write endpoints on `UsersController`. Frontend adds a Settings icon to the sidebar (super_admin only), a guarded `/settings/team` route, a user table with inline role/status actions, and a slide-in drawer for user creation.

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL (backend), Next.js 14 App Router + SWR + Tailwind CSS (frontend). Run all backend commands from `apps/api/`. Run all frontend commands from `apps/web/`. Dev servers already running on ports 3001 (API) and 3456 (web).

---

## File Map

### Backend — New
- `src/common/decorators/require-role.decorator.ts` — `@RequireRole(name)` SetMetadata
- `src/common/guards/role.guard.ts` — reads ROLE_KEY metadata, checks JWT `roles[]`
- `src/database/seeds/roles.seed.ts` — standalone idempotent seed script
- `src/modules/users/roles.controller.ts` — `GET /api/v1/roles`
- `src/modules/users/roles.service.ts` — `findAssignable()`
- `src/modules/users/dto/change-role.dto.ts` — `{ roleId: string }`
- `src/modules/users/dto/change-status.dto.ts` — `{ status: UserStatus }`

### Backend — Modified
- `src/modules/users/users.controller.ts` — add `PATCH /:id/role`, `PATCH /:id/status`; apply `RoleGuard`
- `src/modules/users/users.service.ts` — add `changeRole()`, `changeStatus()`
- `src/modules/users/users.module.ts` — register `RolesController`, `RolesService`

### Frontend — New
- `app/(dashboard)/settings/layout.tsx` — super_admin guard + redirect
- `app/(dashboard)/settings/team/page.tsx` — team management page
- `components/settings/UserTable.tsx` — table with role badges, status dots, action menus
- `components/settings/NewUserDrawer.tsx` — slide-in drawer for user creation

### Frontend — Modified
- `components/layout/Sidebar.tsx` — add Settings icon (super_admin only)
- `types/index.ts` — add `UserWithRoles`, `RoleOption`

---

## Task 1: `RequireRole` decorator + `RoleGuard`

**Files:**
- Create: `apps/api/src/common/decorators/require-role.decorator.ts`
- Create: `apps/api/src/common/guards/role.guard.ts`

- [ ] **Create the decorator**

```typescript
// apps/api/src/common/decorators/require-role.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'role';
export const RequireRole = (role: string) => SetMetadata(ROLE_KEY, role);
```

- [ ] **Create the guard**

```typescript
// apps/api/src/common/guards/role.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/require-role.decorator';
import { JwtPayload } from '../../modules/auth/services/auth.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user?.roles?.includes(required)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
```

- [ ] **Verify compilation**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/api/src/common/decorators/require-role.decorator.ts \
        apps/api/src/common/guards/role.guard.ts
git commit -m "feat(api): add RequireRole decorator and RoleGuard"
```

---

## Task 2: Permissions + Roles seed

**Files:**
- Create: `apps/api/src/database/seeds/roles.seed.ts`

- [ ] **Create the seed script**

```typescript
// apps/api/src/database/seeds/roles.seed.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../../.env') });

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
      relations: ['permissions'],
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
      // Update permissions to ensure they match spec
      role.permissions = rolePerms;
      await roleRepo.save(role);
      console.log(`Updated role: ${roleName}`);
    }
  }

  await ds.destroy();
  console.log('Seed complete');
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Run the seed**

```bash
cd apps/api && npx ts-node -r tsconfig-paths/register src/database/seeds/roles.seed.ts
```

Expected output:
```
Connected to database
Updated role: super_admin
Created role: admin
Created role: usuario
Seed complete
```

- [ ] **Verify via API — login and confirm permissions include new roles**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo $TOKEN | python3 -c "
import sys, json, base64
t = sys.stdin.read().strip().split('.')[1]
t += '=' * (4 - len(t) % 4)
d = json.loads(base64.b64decode(t))
print('roles:', d['roles'])
print('permissions count:', len(d['permissions']))
"
```

Expected: `roles: ['super_admin']`, `permissions count: 14`

- [ ] **Commit**

```bash
git add apps/api/src/database/seeds/roles.seed.ts
git commit -m "feat(api): seed permissions and system roles (super_admin, admin, usuario)"
```

---

## Task 3: `RolesService` + `RolesController`

**Files:**
- Create: `apps/api/src/modules/users/roles.service.ts`
- Create: `apps/api/src/modules/users/roles.controller.ts`
- Modify: `apps/api/src/modules/users/users.module.ts`

- [ ] **Create RolesService**

```typescript
// apps/api/src/modules/users/roles.service.ts
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
```

- [ ] **Create RolesController**

```typescript
// apps/api/src/modules/users/roles.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('v1/roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List assignable roles (excludes super_admin)' })
  findAll() {
    return this.service.findAssignable();
  }
}
```

- [ ] **Register in UsersModule**

```typescript
// apps/api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Verify compilation and test the endpoint**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -10
```

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -s http://localhost:3001/api/v1/roles \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: array with `admin` and `usuario` roles (no `super_admin`).

- [ ] **Commit**

```bash
git add apps/api/src/modules/users/roles.service.ts \
        apps/api/src/modules/users/roles.controller.ts \
        apps/api/src/modules/users/users.module.ts
git commit -m "feat(api): RolesService and RolesController (GET /api/v1/roles)"
```

---

## Task 4: Extend `UsersController` with role/status PATCH + guards

**Files:**
- Create: `apps/api/src/modules/users/dto/change-role.dto.ts`
- Create: `apps/api/src/modules/users/dto/change-status.dto.ts`
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.controller.ts`

- [ ] **Create DTOs**

```typescript
// apps/api/src/modules/users/dto/change-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty()
  @IsUUID('4')
  roleId: string;
}
```

```typescript
// apps/api/src/modules/users/dto/change-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class ChangeStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsEnum(['active', 'suspended'])
  status: UserStatus.ACTIVE | UserStatus.SUSPENDED;
}
```

- [ ] **Add `changeRole` and `changeStatus` to UsersService**

Replace the entire `apps/api/src/modules/users/users.service.ts` with:

```typescript
// apps/api/src/modules/users/users.service.ts
import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
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
    return this.userRepo.find({ where: { tenantId, deletedAt: IsNull() } });
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
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

  async changeRole(tenantId: string, id: string, roleId: string, requesterId: string): Promise<User> {
    if (id === requesterId) throw new ForbiddenException('Cannot change your own role');

    const user = await this.findOne(tenantId, id);
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.name === 'super_admin') throw new ForbiddenException('Cannot assign super_admin role');

    user.roles = [role];
    return this.userRepo.save(user);
  }

  async changeStatus(
    tenantId: string,
    id: string,
    status: UserStatus.ACTIVE | UserStatus.SUSPENDED,
    requesterId: string,
  ): Promise<User> {
    if (id === requesterId) throw new ForbiddenException('Cannot change your own status');

    const user = await this.findOne(tenantId, id);
    user.status = status;
    return this.userRepo.save(user);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.userRepo.softDelete(id);
  }
}
```

- [ ] **Update UsersController with new endpoints and RoleGuard**

```typescript
// apps/api/src/modules/users/users.controller.ts
import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Create user in current tenant (super_admin only)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users in current tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Update user (super_admin only)' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/role')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Change user role (super_admin only)' })
  changeRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.service.changeRole(user.tenantId, id, dto.roleId, user.sub);
  }

  @Patch(':id/status')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Suspend or reactivate user (super_admin only)' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.service.changeStatus(user.tenantId, id, dto.status, user.sub);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user (super_admin only)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Verify compilation**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Test the new endpoints**

First get role IDs:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Get admin role ID
curl -s http://localhost:3001/api/v1/roles -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Create a test user:
```bash
curl -s -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Recep","email":"recep@test.com","password":"Pass1234!"}' \
  | python3 -m json.tool | grep '"id"\|"email"\|"status"'
```

Expected: 201 with the new user object.

- [ ] **Commit**

```bash
git add apps/api/src/modules/users/dto/change-role.dto.ts \
        apps/api/src/modules/users/dto/change-status.dto.ts \
        apps/api/src/modules/users/users.service.ts \
        apps/api/src/modules/users/users.controller.ts
git commit -m "feat(api): PATCH role/status endpoints, RoleGuard on user write operations"
```

---

## Task 5: Frontend types

**Files:**
- Modify: `apps/web/types/index.ts`

- [ ] **Add `UserWithRoles` and `RoleOption` to the types file**

Open `apps/web/types/index.ts` and add these two interfaces after the `Guest` interface:

```typescript
export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

export interface UserWithRoles {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  roles: RoleOption[];
  lastLoginAt: string | null;
  createdAt: string;
}
```

- [ ] **Commit**

```bash
git add apps/web/types/index.ts
git commit -m "feat(web): add UserWithRoles and RoleOption types"
```

---

## Task 6: Sidebar — Settings icon for super_admin

**Files:**
- Modify: `apps/web/components/layout/Sidebar.tsx`

- [ ] **Update Sidebar to show Settings icon for super_admin**

Replace the entire `apps/web/components/layout/Sidebar.tsx` with:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  BedDouble,
  Globe2,
  Settings,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reservations', icon: CalendarDays, label: 'Reservas' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/rooms', icon: BedDouble, label: 'Habitaciones' },
  { href: '/channels', icon: Globe2, label: 'Canales' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-1 flex-shrink-0 animate-fade-in">
      <Link
        href="/"
        className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm mb-4 press"
      >
        S
      </Link>

      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            data-active={active ? 'true' : undefined}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center press nav-hover ${
              active ? 'bg-[#0f766e22] text-primary' : 'text-muted'
            }`}
          >
            <span className="nav-indicator absolute -left-2 top-1/2 w-0.5 h-5 bg-primary rounded-r" />
            <Icon size={16} />
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-2">
        {isSuperAdmin && (
          <Link
            href="/settings/team"
            title="Configuración"
            data-active={pathname.startsWith('/settings') ? 'true' : undefined}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center press nav-hover ${
              pathname.startsWith('/settings') ? 'bg-[#0f766e22] text-primary' : 'text-muted'
            }`}
          >
            <span className="nav-indicator absolute -left-2 top-1/2 w-0.5 h-5 bg-primary rounded-r" />
            <Settings size={16} />
          </Link>
        )}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted press nav-hover-danger"
        >
          <LogOut size={16} />
        </button>
        <div
          title={user?.email}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-xs font-bold text-white"
        >
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Commit**

```bash
git add apps/web/components/layout/Sidebar.tsx
git commit -m "feat(web): add Settings icon to sidebar for super_admin"
```

---

## Task 7: Settings layout with super_admin guard

**Files:**
- Create: `apps/web/app/(dashboard)/settings/layout.tsx`

- [ ] **Create the settings layout**

```typescript
// apps/web/app/(dashboard)/settings/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !user.roles?.includes('super_admin')) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user?.roles?.includes('super_admin')) return null;

  return <>{children}</>;
}
```

- [ ] **Commit**

```bash
git add "apps/web/app/(dashboard)/settings/layout.tsx"
git commit -m "feat(web): settings layout with super_admin route guard"
```

---

## Task 8: `UserTable` component

**Files:**
- Create: `apps/web/components/settings/UserTable.tsx`

- [ ] **Create the UserTable component**

```typescript
// apps/web/components/settings/UserTable.tsx
'use client';

import { useState } from 'react';
import { MoreHorizontal, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import type { UserWithRoles, RoleOption } from '@/types';

interface Props {
  users: UserWithRoles[];
  roles: RoleOption[];
  currentUserId: string;
  onMutate: () => void;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-[#0f766e22] text-primary border border-[#0f766e33]',
  usuario: 'bg-card text-muted border border-border',
  super_admin: 'bg-[#7c3aed22] text-[#a78bfa] border border-[#7c3aed33]',
};

export default function UserTable({ users, roles, currentUserId, onMutate }: Props) {
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleChangeRole(userId: string, roleId: string) {
    setLoadingId(userId);
    try {
      await api.patch(`/api/v1/users/${userId}/role`, { roleId });
      onMutate();
    } finally {
      setLoadingId(null);
      setChangingRoleFor(null);
    }
  }

  async function handleChangeStatus(userId: string, currentStatus: string) {
    setLoadingId(userId);
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/api/v1/users/${userId}/status`, { status: newStatus });
      onMutate();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    setLoadingId(userId);
    try {
      await api.delete(`/api/v1/users/${userId}`);
      onMutate();
    } finally {
      setLoadingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-sm">
        No hay usuarios todavía. Creá el primero con el botón de arriba.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Usuario</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Email</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Rol</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Estado</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          const isSuspended = u.status === 'suspended';
          const roleName = u.roles[0]?.name ?? '—';
          const isChangingRole = changingRoleFor === u.id;
          const isLoading = loadingId === u.id;

          return (
            <tr
              key={u.id}
              className={`group border-b border-border transition-opacity ${
                isSuspended ? 'opacity-50' : ''
              }`}
            >
              {/* Name */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {u.firstName[0]?.toUpperCase()}
                  </div>
                  <span className="text-white font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                </div>
              </td>

              {/* Email */}
              <td className="py-3 px-4 text-muted">{u.email}</td>

              {/* Role */}
              <td className="py-3 px-4">
                {isChangingRole ? (
                  <div className="flex items-center gap-1">
                    <select
                      autoFocus
                      defaultValue={u.roles[0]?.id ?? ''}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      onBlur={() => setChangingRoleFor(null)}
                      disabled={isLoading}
                      className="bg-bg border border-border rounded-md px-2 py-1 text-xs text-white"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name === 'admin' ? 'Admin' : 'Usuario'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    ROLE_STYLES[roleName] ?? 'bg-card text-muted border border-border'
                  }`}>
                    {roleName === 'admin' ? 'Admin' : roleName === 'usuario' ? 'Usuario' : roleName}
                  </span>
                )}
              </td>

              {/* Status */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSuspended ? 'bg-[#fb923c]' : 'bg-emerald-500'
                  }`} />
                  <span className="text-muted text-xs capitalize">
                    {isSuspended ? 'Suspendido' : 'Activo'}
                  </span>
                </div>
              </td>

              {/* Actions */}
              <td className="py-3 px-4">
                {!isSelf && (
                  <div className="relative flex justify-end">
                    <button
                      className="press opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-white hover:bg-card transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        const menu = e.currentTarget.nextElementSibling as HTMLElement;
                        menu?.classList.toggle('hidden');
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    <div className="hidden absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[160px] animate-fade-up">
                      <button
                        onMouseDown={() => { setChangingRoleFor(u.id); }}
                        className="press w-full text-left px-3 py-2 text-xs text-white hover:bg-card flex items-center gap-2"
                      >
                        <ChevronDown size={12} />
                        Cambiar rol
                      </button>
                      <button
                        onMouseDown={() => handleChangeStatus(u.id, u.status)}
                        disabled={isLoading}
                        className="press w-full text-left px-3 py-2 text-xs text-white hover:bg-card"
                      >
                        {isSuspended ? 'Reactivar' : 'Suspender'}
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onMouseDown={() => handleDelete(u.id)}
                        disabled={isLoading}
                        className="press w-full text-left px-3 py-2 text-xs text-[#f87171] hover:bg-card"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Commit**

```bash
git add apps/web/components/settings/UserTable.tsx
git commit -m "feat(web): UserTable component with role badges, status dots, action menu"
```

---

## Task 9: `NewUserDrawer` component

**Files:**
- Create: `apps/web/components/settings/NewUserDrawer.tsx`

- [ ] **Create the drawer**

```typescript
// apps/web/components/settings/NewUserDrawer.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import type { RoleOption } from '@/types';

interface Props {
  roles: RoleOption[];
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
};

export default function NewUserDrawer({ roles, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ ...EMPTY, roleId: roles[0]?.id ?? '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'email') setEmailError('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roleId) { setError('Seleccioná un rol'); return; }
    setSubmitting(true);
    setError('');
    setEmailError('');

    try {
      await api.post('/api/v1/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleIds: [form.roleId],
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message ?? 'Error al crear usuario';
      if (msg.toLowerCase().includes('email')) {
        setEmailError('Este email ya está registrado');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-sm bg-surface border-l border-border h-full flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Nuevo usuario</h2>
            <p className="text-xs text-muted mt-0.5">Completá los datos del colaborador</p>
          </div>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                Nombre <span className="text-[#f87171]">*</span>
              </label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
                placeholder="María"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                Apellido <span className="text-[#f87171]">*</span>
              </label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
                placeholder="García"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Email <span className="text-[#f87171]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              placeholder="maria@hotel.com"
              className={`input-field w-full bg-bg border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted ${
                emailError ? 'border-[#f87171]' : 'border-border'
              }`}
            />
            {emailError && (
              <p className="text-xs text-[#f87171] mt-1">{emailError}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Contraseña temporal <span className="text-[#f87171]">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Rol <span className="text-[#f87171]">*</span>
            </label>
            <select
              value={form.roleId}
              onChange={(e) => set('roleId', e.target.value)}
              required
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
            >
              <option value="" disabled>Seleccionar rol...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name === 'admin' ? 'Admin — Gerente de propiedad' : 'Usuario — Recepcionista'}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-[#f87171] animate-fade-in">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="press flex-1 bg-surface border border-border text-[#ccc] text-sm py-2.5 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.firstName || !form.lastName || !form.email || !form.password || !form.roleId}
            className="press flex-1 bg-primary text-white text-sm py-2.5 rounded-lg font-medium disabled:opacity-40"
          >
            {submitting ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add apps/web/components/settings/NewUserDrawer.tsx
git commit -m "feat(web): NewUserDrawer with slide-in animation and form validation"
```

---

## Task 10: `/settings/team` page

**Files:**
- Create: `apps/web/app/(dashboard)/settings/team/page.tsx`

- [ ] **Create the page**

```typescript
// apps/web/app/(dashboard)/settings/team/page.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Plus, Users } from 'lucide-react';
import UserTable from '@/components/settings/UserTable';
import NewUserDrawer from '@/components/settings/NewUserDrawer';
import type { UserWithRoles, RoleOption } from '@/types';

export default function TeamPage() {
  const { user } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);

  const { data: users = [], mutate: mutateUsers } = useSWR<UserWithRoles[]>(
    '/api/v1/users',
    fetcher,
  );

  const { data: roles = [] } = useSWR<RoleOption[]>(
    '/api/v1/roles',
    fetcher,
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-muted" />
            <h2 className="text-lg font-semibold">Equipo</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Gestión de usuarios y roles del hotel
          </p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={14} />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-up delay-50">
        <UserTable
          users={users}
          roles={roles}
          currentUserId={user?.sub ?? ''}
          onMutate={() => mutateUsers()}
        />
      </div>

      {/* Drawer */}
      {showDrawer && (
        <NewUserDrawer
          roles={roles}
          onClose={() => setShowDrawer(false)}
          onCreated={() => mutateUsers()}
        />
      )}
    </div>
  );
}
```

- [ ] **Verify the page renders**

Navigate to `http://localhost:3456/settings/team` while logged in as `admin@hoteltravertino.com`. Expected: page loads with the team table, no redirect.

- [ ] **Verify the Settings icon appears in sidebar** — gear icon visible in the sidebar footer area.

- [ ] **Verify creating a user works end-to-end:**
  1. Click "Nuevo usuario"
  2. Fill in name, email `nuevo@hotel.com`, password `TestPass1!`, role Admin
  3. Click "Crear usuario"
  4. Drawer closes, user appears in table with "Admin" badge and green dot

- [ ] **Verify role change:**
  1. Hover over the new user's row — `···` menu appears
  2. Click "Cambiar rol" — role select appears inline
  3. Change to Usuario — updates immediately

- [ ] **Verify suspend:**
  1. Open `···` menu → click "Suspender"
  2. Row becomes `opacity-50`, dot turns orange

- [ ] **Commit**

```bash
git add "apps/web/app/(dashboard)/settings/team/page.tsx"
git commit -m "feat(web): /settings/team page — user table, create drawer, role/status management"
```

---

## Task 11: Final commit — tie up and push

- [ ] **Check git status — nothing stale**

```bash
git status
```

Expected: clean working tree.

- [ ] **Verify the full flow one more time via API**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# List users
curl -s http://localhost:3001/api/v1/users -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(u['email'], [r['name'] for r in u['roles']]) for u in json.load(sys.stdin)]"

# List assignable roles
curl -s http://localhost:3001/api/v1/roles -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(r['name']) for r in json.load(sys.stdin)]"
```

Expected:
```
admin@hoteltravertino.com ['super_admin']
admin
usuario
```

- [ ] **Final commit if any uncommitted changes**

```bash
git add -A && git status
# Only commit if there are actual changes
```

---

## Self-Review Notes

- **Spec coverage:** All sections covered — seed ✓, RolesController ✓, PATCH role/status ✓, RoleGuard ✓, sidebar icon ✓, settings layout guard ✓, team page ✓, drawer ✓, table ✓.
- **Type consistency:** `UserWithRoles` and `RoleOption` defined in Task 5, used in Tasks 8, 9, 10. `changeRole`/`changeStatus` signatures match between service (Task 4) and controller (Task 4). `ChangeRoleDto.roleId` matches `api.patch(…, { roleId })` in UserTable.
- **No placeholders:** All steps have exact code and commands.
- **Scope:** Single plan, backend + frontend, focused on 3 fixed roles + team page.
