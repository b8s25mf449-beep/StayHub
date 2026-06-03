# StayHub Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete StayHub multi-tenant hotel management backend: database schema + all CRUD modules (Tenants, Users, Properties, RoomTypes, Rooms, Guests, Reservations, Payments).

**Architecture:** Multi-tenant NestJS 11 / TypeORM 1.0 / PostgreSQL 17 (Supabase). Every resource carries `tenant_id`; services filter all queries by `tenantId` from the JWT payload. Auth module (JWT RS256, TOTP, brute-force, refresh-token rotation) is already fully implemented and must not be changed.

**Tech Stack:** NestJS 11, TypeORM 1.0, PostgreSQL 17, class-validator, Swagger, Supabase MCP execute_sql

---

## File Map

```
apps/api/src/
├── app.module.ts                          MODIFY — register all new entities
├── modules/
│   ├── tenants/
│   │   ├── tenants.module.ts              CREATE
│   │   ├── tenants.controller.ts          CREATE
│   │   ├── tenants.service.ts             CREATE
│   │   └── dto/
│   │       ├── create-tenant.dto.ts       CREATE
│   │       └── update-tenant.dto.ts       CREATE
│   ├── users/
│   │   ├── users.module.ts                CREATE
│   │   ├── users.controller.ts            CREATE
│   │   ├── users.service.ts               CREATE
│   │   └── dto/
│   │       ├── create-user.dto.ts         CREATE
│   │       └── update-user.dto.ts         CREATE
│   ├── properties/
│   │   ├── properties.module.ts           CREATE
│   │   ├── properties.controller.ts       CREATE
│   │   ├── properties.service.ts          CREATE
│   │   ├── dto/
│   │   │   ├── create-property.dto.ts     CREATE
│   │   │   └── update-property.dto.ts     CREATE
│   │   ├── room-types/
│   │   │   ├── room-types.module.ts       CREATE
│   │   │   ├── room-types.controller.ts   CREATE
│   │   │   ├── room-types.service.ts      CREATE
│   │   │   └── dto/
│   │   │       ├── create-room-type.dto.ts  CREATE
│   │   │       └── update-room-type.dto.ts  CREATE
│   │   └── rooms/
│   │       ├── rooms.module.ts            CREATE
│   │       ├── rooms.controller.ts        CREATE
│   │       ├── rooms.service.ts           CREATE
│   │       └── dto/
│   │           ├── create-room.dto.ts     CREATE
│   │           └── update-room.dto.ts     CREATE
│   ├── guests/
│   │   ├── guests.module.ts               CREATE
│   │   ├── guests.controller.ts           CREATE
│   │   ├── guests.service.ts              CREATE
│   │   └── dto/
│   │       ├── create-guest.dto.ts        CREATE
│   │       └── update-guest.dto.ts        CREATE
│   ├── reservations/
│   │   ├── reservations.module.ts         CREATE
│   │   ├── reservations.controller.ts     CREATE
│   │   ├── reservations.service.ts        CREATE
│   │   └── dto/
│   │       ├── create-reservation.dto.ts  CREATE
│   │       └── update-reservation.dto.ts  CREATE
│   └── payments/
│       ├── payments.module.ts             CREATE
│       ├── payments.controller.ts         CREATE
│       ├── payments.service.ts            CREATE
│       └── dto/
│           ├── create-payment.dto.ts      CREATE
│           └── update-payment.dto.ts      CREATE
```

---

## Task 1: Database Schema Creation

**Files:** Supabase MCP execute_sql (no local files)

- [ ] **Step 1: Create enum types and core tables**

Execute via Supabase MCP `execute_sql`:

```sql
-- Enum types
CREATE TYPE tenant_status AS ENUM ('active','suspended','trial','cancelled');
CREATE TYPE tenant_plan   AS ENUM ('starter','professional','enterprise');
CREATE TYPE user_status   AS ENUM ('active','inactive','suspended','pending_verification');
CREATE TYPE property_type   AS ENUM ('hotel','hostel','vacation_rental','apartment','boutique');
CREATE TYPE property_status AS ENUM ('active','inactive','maintenance');
CREATE TYPE room_status     AS ENUM ('available','occupied','maintenance','out_of_order','cleaning');
CREATE TYPE guest_status    AS ENUM ('active','blacklisted','vip');
CREATE TYPE document_type   AS ENUM ('passport','dni','cedula','drivers_license');
CREATE TYPE reservation_status AS ENUM ('inquiry','pending','confirmed','checked_in','checked_out','cancelled','no_show');
CREATE TYPE reservation_source AS ENUM ('direct','booking_com','airbnb','expedia','ical','phone','walk_in');
CREATE TYPE payment_status   AS ENUM ('pending','processing','completed','failed','refunded','partially_refunded','cancelled');
CREATE TYPE payment_method   AS ENUM ('credit_card','debit_card','bank_transfer','cash','mercadopago','stripe');
CREATE TYPE payment_provider AS ENUM ('stripe','mercadopago','manual');

-- tenants
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  website       TEXT,
  phone         TEXT,
  country       TEXT,
  timezone      TEXT,
  currency      TEXT,
  status        tenant_status NOT NULL DEFAULT 'trial',
  plan          tenant_plan   NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ,
  settings      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- permissions
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- roles
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- users
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  status                user_status NOT NULL DEFAULT 'pending_verification',
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  totp_secret           TEXT,
  totp_enabled          BOOLEAN NOT NULL DEFAULT false,
  backup_codes          JSONB,
  last_login_at         TIMESTAMPTZ,
  password_changed_at   TIMESTAMPTZ,
  avatar_url            TEXT,
  phone                 TEXT,
  locale                TEXT,
  timezone              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- junction tables
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- refresh_tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  device_id   TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  replaced_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- audit_logs
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- properties
CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  type            property_type   NOT NULL,
  status          property_status NOT NULL DEFAULT 'active',
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT,
  zip_code        TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  phone           TEXT,
  email           TEXT,
  timezone        TEXT,
  currency        TEXT,
  check_in_time   TEXT,
  check_out_time  TEXT,
  amenities       JSONB,
  images          JSONB,
  policies        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- room_types
CREATE TABLE room_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  max_occupancy     INTEGER NOT NULL,
  base_price        NUMERIC(10,2) NOT NULL,
  currency          TEXT,
  amenities         JSONB,
  images            JSONB,
  bed_configuration JSONB,
  area_sqm          NUMERIC(6,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- rooms
CREATE TABLE rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number  TEXT NOT NULL,
  floor        TEXT,
  status       room_status NOT NULL DEFAULT 'available',
  notes        TEXT,
  attributes   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- guests
CREATE TABLE guests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT UNIQUE,
  phone                    TEXT,
  nationality              TEXT,
  document_type            document_type,
  document_number_encrypted TEXT,
  date_of_birth_encrypted  TEXT,
  status                   guest_status NOT NULL DEFAULT 'active',
  address                  TEXT,
  city                     TEXT,
  country                  TEXT,
  language                 TEXT,
  preferences              JSONB,
  notes                    TEXT,
  total_stays              INTEGER NOT NULL DEFAULT 0,
  total_revenue            NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

-- reservations
CREATE TABLE reservations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_id               UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  guest_id              UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  confirmation_number   TEXT NOT NULL UNIQUE,
  status                reservation_status NOT NULL DEFAULT 'pending',
  source                reservation_source NOT NULL DEFAULT 'direct',
  check_in_date         DATE NOT NULL,
  check_out_date        DATE NOT NULL,
  actual_check_in       TIMESTAMPTZ,
  actual_check_out      TIMESTAMPTZ,
  adults_count          INTEGER NOT NULL DEFAULT 1,
  children_count        INTEGER NOT NULL DEFAULT 0,
  base_amount           NUMERIC(12,2) NOT NULL,
  taxes_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  extras_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(12,2) NOT NULL,
  currency              TEXT,
  channel_reservation_id TEXT,
  notes                 TEXT,
  extras                JSONB,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- payments
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id      UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  amount              NUMERIC(12,2) NOT NULL,
  currency            TEXT NOT NULL,
  status              payment_status   NOT NULL DEFAULT 'pending',
  method              payment_method   NOT NULL,
  provider            payment_provider NOT NULL,
  provider_payment_id TEXT,
  provider_response   JSONB,
  refunded_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_tenant_id         ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_tenant_id    ON properties(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_room_types_property     ON room_types(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_property          ON rooms(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reservations_tenant     ON reservations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reservations_room_dates ON reservations(room_id, check_in_date, check_out_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_reservation    ON payments(reservation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_guests_tenant           ON guests(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_hash     ON refresh_tokens(token_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_tenant       ON audit_logs(tenant_id);
```

- [ ] **Step 2: Verify tables were created**

Run via Supabase MCP `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
Expected: 15 tables listed.

---

## Task 2: Update AppModule — Register All Entities

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { RoomTypesModule } from './modules/properties/room-types/room-types.module';
import { RoomsModule } from './modules/properties/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [databaseConfig, jwtConfig],
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    AuthModule,
    HealthModule,
    TenantsModule,
    UsersModule,
    PropertiesModule,
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    ReservationsModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat: register all domain modules in AppModule"
```

---

## Task 3: Tenants Module

**Files:**
- Create: `apps/api/src/modules/tenants/tenants.module.ts`
- Create: `apps/api/src/modules/tenants/tenants.controller.ts`
- Create: `apps/api/src/modules/tenants/tenants.service.ts`
- Create: `apps/api/src/modules/tenants/dto/create-tenant.dto.ts`
- Create: `apps/api/src/modules/tenants/dto/update-tenant.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/tenants/dto/create-tenant.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TenantPlan } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty() @IsString() @IsNotEmpty() slug: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ enum: TenantPlan }) @IsOptional() @IsEnum(TenantPlan) plan?: TenantPlan;
  @ApiPropertyOptional() @IsOptional() @IsDateString() trial_ends_at?: string;
}
```

`apps/api/src/modules/tenants/dto/update-tenant.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/tenants/tenants.service.ts`:
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already in use');
    const tenant = this.repo.create(dto);
    return this.repo.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ where: { deletedAt: null } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, dto);
    return this.repo.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.repo.softDelete(tenant.id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/tenants/tenants.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('v1/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete tenant' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/tenants/tenants.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tenants/
git commit -m "feat: add Tenants CRUD module"
```

---

## Task 4: Users Module

**Files:**
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/dto/create-user.dto.ts`
- Create: `apps/api/src/modules/users/dto/update-user.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/users/dto/create-user.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsArray, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) roleIds?: string[];
}
```

`apps/api/src/modules/users/dto/update-user.dto.ts`:
```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/users/users.service.ts`:
```typescript
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
    const user = await this.findOne(tenantId, id);
    await this.userRepo.softDelete(user.id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/users/users.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user in current tenant' })
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
  @ApiOperation({ summary: 'Update user' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat: add Users CRUD module with role assignment"
```

---

## Task 5: Properties Module

**Files:**
- Create: `apps/api/src/modules/properties/properties.module.ts`
- Create: `apps/api/src/modules/properties/properties.controller.ts`
- Create: `apps/api/src/modules/properties/properties.service.ts`
- Create: `apps/api/src/modules/properties/dto/create-property.dto.ts`
- Create: `apps/api/src/modules/properties/dto/update-property.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/properties/dto/create-property.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsEmail } from 'class-validator';
import { PropertyType, PropertyStatus } from '../entities/property.entity';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: PropertyType }) @IsEnum(PropertyType) type: PropertyType;
  @ApiPropertyOptional({ enum: PropertyStatus }) @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zip_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkInTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOutTime?: string;
}
```

`apps/api/src/modules/properties/dto/update-property.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/properties/properties.service.ts`:
```typescript
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
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/properties/properties.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('v1/properties')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create property' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePropertyDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List properties' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update property' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete property' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/properties/properties.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/properties/properties.module.ts \
        apps/api/src/modules/properties/properties.controller.ts \
        apps/api/src/modules/properties/properties.service.ts \
        apps/api/src/modules/properties/dto/
git commit -m "feat: add Properties CRUD module"
```

---

## Task 6: Room Types Module

**Files:**
- Create: `apps/api/src/modules/properties/room-types/room-types.module.ts`
- Create: `apps/api/src/modules/properties/room-types/room-types.controller.ts`
- Create: `apps/api/src/modules/properties/room-types/room-types.service.ts`
- Create: `apps/api/src/modules/properties/room-types/dto/create-room-type.dto.ts`
- Create: `apps/api/src/modules/properties/room-types/dto/update-room-type.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/properties/room-types/dto/create-room-type.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @IsPositive() maxOccupancy: number;
  @ApiProperty() @IsNumber() @IsPositive() basePrice: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() areaSqm?: number;
}
```

`apps/api/src/modules/properties/room-types/dto/update-room-type.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateRoomTypeDto } from './create-room-type.dto';
export class UpdateRoomTypeDto extends PartialType(CreateRoomTypeDto) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/properties/room-types/room-types.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (propertyId) where.propertyId = propertyId;
    return this.repo.find({ where: where as any });
  }

  async findOne(tenantId: string, id: string): Promise<RoomType> {
    const rt = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
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
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/properties/room-types/room-types.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/services/auth.service';

@ApiTags('Room Types')
@ApiBearerAuth()
@Controller('v1/room-types')
export class RoomTypesController {
  constructor(private readonly service: RoomTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create room type' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomTypeDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List room types' })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('propertyId') propertyId?: string) {
    return this.service.findAll(user.tenantId, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room type' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room type' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room type' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/properties/room-types/room-types.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomType } from '../entities/room-type.entity';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType])],
  controllers: [RoomTypesController],
  providers: [RoomTypesService],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/properties/room-types/
git commit -m "feat: add Room Types CRUD module"
```

---

## Task 7: Rooms Module

**Files:**
- Create: `apps/api/src/modules/properties/rooms/rooms.module.ts`
- Create: `apps/api/src/modules/properties/rooms/rooms.controller.ts`
- Create: `apps/api/src/modules/properties/rooms/rooms.service.ts`
- Create: `apps/api/src/modules/properties/rooms/dto/create-room.dto.ts`
- Create: `apps/api/src/modules/properties/rooms/dto/update-room.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/properties/rooms/dto/create-room.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { RoomStatus } from '../../entities/room.entity';

export class CreateRoomDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsUUID() roomTypeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() roomNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional({ enum: RoomStatus }) @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
```

`apps/api/src/modules/properties/rooms/dto/update-room.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/properties/rooms/rooms.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly repo: Repository<Room>,
  ) {}

  async create(tenantId: string, dto: CreateRoomDto): Promise<Room> {
    const room = this.repo.create({ ...dto, tenantId });
    return this.repo.save(room);
  }

  async findAll(tenantId: string, propertyId?: string): Promise<Room[]> {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (propertyId) where.propertyId = propertyId;
    return this.repo.find({ where: where as any });
  }

  async findOne(tenantId: string, id: string): Promise<Room> {
    const room = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(tenantId, id);
    Object.assign(room, dto);
    return this.repo.save(room);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/properties/rooms/rooms.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/services/auth.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller('v1/rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create room' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms' })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('propertyId') propertyId?: string) {
    return this.service.findAll(user.tenantId, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/properties/rooms/rooms.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/properties/rooms/
git commit -m "feat: add Rooms CRUD module"
```

---

## Task 8: Guests Module

**Files:**
- Create: `apps/api/src/modules/guests/guests.module.ts`
- Create: `apps/api/src/modules/guests/guests.controller.ts`
- Create: `apps/api/src/modules/guests/guests.service.ts`
- Create: `apps/api/src/modules/guests/dto/create-guest.dto.ts`
- Create: `apps/api/src/modules/guests/dto/update-guest.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/guests/dto/create-guest.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { GuestStatus, DocumentType } from '../entities/guest.entity';

export class CreateGuestDto {
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional({ enum: DocumentType }) @IsOptional() @IsEnum(DocumentType) documentType?: DocumentType;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional({ enum: GuestStatus }) @IsOptional() @IsEnum(GuestStatus) status?: GuestStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
```

`apps/api/src/modules/guests/dto/update-guest.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateGuestDto } from './create-guest.dto';
export class UpdateGuestDto extends PartialType(CreateGuestDto) {}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/guests/guests.service.ts`:
```typescript
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
    const guest = this.repo.create({ ...dto, tenantId });
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
    Object.assign(guest, dto);
    return this.repo.save(guest);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/guests/guests.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Guests')
@ApiBearerAuth()
@Controller('v1/guests')
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Post()
  @ApiOperation({ summary: 'Register guest' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuestDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List guests (optional search by name/email)' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.service.findAll(user.tenantId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update guest' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete guest' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/guests/guests.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/guests/
git commit -m "feat: add Guests CRUD module with name/email search"
```

---

## Task 9: Reservations Module

**Files:**
- Create: `apps/api/src/modules/reservations/reservations.module.ts`
- Create: `apps/api/src/modules/reservations/reservations.controller.ts`
- Create: `apps/api/src/modules/reservations/reservations.service.ts`
- Create: `apps/api/src/modules/reservations/dto/create-reservation.dto.ts`
- Create: `apps/api/src/modules/reservations/dto/update-reservation.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/reservations/dto/create-reservation.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID,
  IsDateString, IsNumber, IsPositive, Min,
} from 'class-validator';
import { ReservationSource } from '../entities/reservation.entity';

export class CreateReservationDto {
  @ApiProperty() @IsUUID() propertyId: string;
  @ApiProperty() @IsUUID() roomId: string;
  @ApiProperty() @IsUUID() guestId: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() checkInDate: string;
  @ApiProperty({ example: '2026-07-05' }) @IsDateString() checkOutDate: string;
  @ApiProperty() @IsNumber() @IsPositive() baseAmount: number;
  @ApiProperty() @IsNumber() @IsPositive() totalAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxesAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) extrasAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() adultsCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) childrenCount?: number;
  @ApiPropertyOptional({ enum: ReservationSource }) @IsOptional() @IsEnum(ReservationSource) source?: ReservationSource;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channelReservationId?: string;
}
```

`apps/api/src/modules/reservations/dto/update-reservation.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @ApiPropertyOptional({ enum: ReservationStatus }) @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkInDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkOutDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/reservations/reservations.service.ts`:
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation) private readonly repo: Repository<Reservation>,
  ) {}

  private generateConfirmationNumber(): string {
    return `SH-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;
  }

  async checkAvailability(roomId: string, checkInDate: string, checkOutDate: string, excludeId?: string): Promise<void> {
    const qb = this.repo.createQueryBuilder('r')
      .where('r.room_id = :roomId', { roomId })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.status NOT IN (:...cancelled)', {
        cancelled: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
      })
      .andWhere('r.check_in_date < :checkOut', { checkOut: checkOutDate })
      .andWhere('r.check_out_date > :checkIn', { checkIn: checkInDate });

    if (excludeId) qb.andWhere('r.id != :excludeId', { excludeId });

    const conflict = await qb.getOne();
    if (conflict) throw new ConflictException('Room not available for selected dates');
  }

  async create(tenantId: string, dto: CreateReservationDto): Promise<Reservation> {
    await this.checkAvailability(dto.roomId, dto.checkInDate, dto.checkOutDate);
    const reservation = this.repo.create({
      ...dto,
      tenantId,
      confirmationNumber: this.generateConfirmationNumber(),
    });
    return this.repo.save(reservation);
  }

  async findAll(tenantId: string): Promise<Reservation[]> {
    return this.repo.find({
      where: { tenantId, deletedAt: null },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Reservation> {
    const r = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  async update(tenantId: string, id: string, dto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findOne(tenantId, id);

    if ((dto.checkInDate || dto.checkOutDate) && reservation.status !== ReservationStatus.CANCELLED) {
      await this.checkAvailability(
        reservation.roomId,
        dto.checkInDate ?? reservation.checkInDate,
        dto.checkOutDate ?? reservation.checkOutDate,
        id,
      );
    }

    if (dto.status === ReservationStatus.CANCELLED && !reservation.cancelledAt) {
      reservation.cancelledAt = new Date();
    }
    if (dto.status === ReservationStatus.CHECKED_IN && !reservation.actualCheckIn) {
      reservation.actualCheckIn = new Date();
    }
    if (dto.status === ReservationStatus.CHECKED_OUT && !reservation.actualCheckOut) {
      reservation.actualCheckOut = new Date();
    }

    Object.assign(reservation, dto);
    return this.repo.save(reservation);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/reservations/reservations.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('v1/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create reservation (checks availability)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReservationDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reservation / change status' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reservation' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/reservations/reservations.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reservations/
git commit -m "feat: add Reservations module with availability check and status transitions"
```

---

## Task 10: Payments Module

**Files:**
- Create: `apps/api/src/modules/payments/payments.module.ts`
- Create: `apps/api/src/modules/payments/payments.controller.ts`
- Create: `apps/api/src/modules/payments/payments.service.ts`
- Create: `apps/api/src/modules/payments/dto/create-payment.dto.ts`
- Create: `apps/api/src/modules/payments/dto/update-payment.dto.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/payments/dto/create-payment.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsPositive } from 'class-validator';
import { PaymentMethod, PaymentProvider } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() reservationId: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty() @IsString() @IsNotEmpty() currency: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiProperty({ enum: PaymentProvider }) @IsEnum(PaymentProvider) provider: PaymentProvider;
  @ApiPropertyOptional() @IsOptional() @IsString() providerPaymentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
```

`apps/api/src/modules/payments/dto/update-payment.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) refundedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() providerPaymentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
```

- [ ] **Step 2: Create Service**

`apps/api/src/modules/payments/payments.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
  ) {}

  async create(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.repo.create({ ...dto, tenantId });
    return this.repo.save(payment);
  }

  async findAll(tenantId: string, reservationId?: string): Promise<Payment[]> {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (reservationId) where.reservationId = reservationId;
    return this.repo.find({ where: where as any, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(tenantId: string, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(tenantId, id);
    if (dto.status === PaymentStatus.COMPLETED && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    Object.assign(payment, dto);
    return this.repo.save(payment);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
```

- [ ] **Step 3: Create Controller**

`apps/api/src/modules/payments/payments.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Record payment' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiQuery({ name: 'reservationId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('reservationId') reservationId?: string) {
    return this.service.findAll(user.tenantId, reservationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment status' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete payment' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
```

- [ ] **Step 4: Create Module**

`apps/api/src/modules/payments/payments.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/
git commit -m "feat: add Payments module with status tracking"
```

---

## Task 11: Seed Data — First Tenant, Admin User & Permissions

**Files:**
- Create: `apps/api/src/database/seed.ts`

- [ ] **Step 1: Create seed script**

`apps/api/src/database/seed.ts`:
```typescript
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
});

const PERMISSIONS = [
  { name: 'tenants:read',        resource: 'tenants',       action: 'read' },
  { name: 'tenants:write',       resource: 'tenants',       action: 'write' },
  { name: 'users:read',          resource: 'users',         action: 'read' },
  { name: 'users:write',         resource: 'users',         action: 'write' },
  { name: 'properties:read',     resource: 'properties',    action: 'read' },
  { name: 'properties:write',    resource: 'properties',    action: 'write' },
  { name: 'rooms:read',          resource: 'rooms',         action: 'read' },
  { name: 'rooms:write',         resource: 'rooms',         action: 'write' },
  { name: 'guests:read',         resource: 'guests',        action: 'read' },
  { name: 'guests:write',        resource: 'guests',        action: 'write' },
  { name: 'reservations:read',   resource: 'reservations',  action: 'read' },
  { name: 'reservations:write',  resource: 'reservations',  action: 'write' },
  { name: 'payments:read',       resource: 'payments',      action: 'read' },
  { name: 'payments:write',      resource: 'payments',      action: 'write' },
];

async function seed() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // Permissions
    for (const perm of PERMISSIONS) {
      await qr.query(
        `INSERT INTO permissions (name, resource, action) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [perm.name, perm.resource, perm.action],
      );
    }

    // Admin role (system)
    await qr.query(
      `INSERT INTO roles (name, description, is_system) VALUES ('super_admin', 'Full system access', true) ON CONFLICT DO NOTHING`,
    );
    const [adminRole] = await qr.query(`SELECT id FROM roles WHERE name = 'super_admin' AND is_system = true`);

    // Assign all permissions to admin role
    const allPerms = await qr.query(`SELECT id FROM permissions`);
    for (const perm of allPerms) {
      await qr.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [adminRole.id, perm.id],
      );
    }

    // Tenant
    await qr.query(
      `INSERT INTO tenants (slug, name, country, currency, status, plan)
       VALUES ('hotel-travertino', 'Hotel Travertino', 'AR', 'ARS', 'active', 'professional')
       ON CONFLICT (slug) DO NOTHING`,
    );
    const [tenant] = await qr.query(`SELECT id FROM tenants WHERE slug = 'hotel-travertino'`);

    // Admin user
    const passwordHash = await argon2.hash('Admin123!');
    await qr.query(
      `INSERT INTO users (tenant_id, email, first_name, last_name, password_hash, status, email_verified)
       VALUES ($1, 'admin@hoteltravertino.com', 'Admin', 'StayHub', $2, 'active', true)
       ON CONFLICT (email) DO NOTHING`,
      [tenant.id, passwordHash],
    );
    const [adminUser] = await qr.query(
      `SELECT id FROM users WHERE email = 'admin@hoteltravertino.com'`,
    );

    await qr.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminUser.id, adminRole.id],
    );

    await qr.commitTransaction();
    console.log('✅ Seed complete');
    console.log(`Tenant: hotel-travertino (${tenant.id})`);
    console.log(`Admin:  admin@hoteltravertino.com / Admin123!`);
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

seed();
```

- [ ] **Step 2: Add seed script to package.json**

In `apps/api/package.json`, add to `"scripts"`:
```json
"seed": "ts-node -r tsconfig-paths/register src/database/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd apps/api && npm run seed
```

Expected output:
```
✅ Seed complete
Tenant: hotel-travertino (<uuid>)
Admin:  admin@hoteltravertino.com / Admin123!
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/database/seed.ts apps/api/package.json
git commit -m "feat: add seed script with admin user, roles and permissions"
```

---

## Task 12: Build Verification

- [ ] **Step 1: Build the project**

```bash
cd apps/api && npm run build
```
Expected: `dist/` folder created, no TypeScript errors.

- [ ] **Step 2: Start the server**

```bash
cd apps/api && npm run start:dev
```
Expected: `StayHub API running on port 3001`

- [ ] **Step 3: Test login endpoint**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin123!"}' | jq .
```
Expected: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 900, "tokenType": "Bearer" }`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 0 StayHub backend — all CRUD modules operational"
```
