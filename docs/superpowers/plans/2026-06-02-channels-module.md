# Channels Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Channels module — connection management per room/OTA and iCal import that auto-creates reservations and guest placeholders from OTA `.ics` feeds.

**Architecture:** `ChannelConnectionsService` handles CRUD + sync orchestration; `ICalImportService` fetches the OTA URL, parses RFC 5545, deduplicates by `channelReservationId`, and creates guests + reservations. All endpoints are JWT-protected. Manual sync only (no scheduled job).

**Tech Stack:** NestJS 11, TypeORM 1.0, PostgreSQL (Supabase MCP), `node-ical`, `axios`

---

## File Map

```
apps/api/src/modules/channels/
├── channels.module.ts                          CREATE
├── channels.controller.ts                      CREATE
├── channels.service.ts                         CREATE
├── ical-import.service.ts                      CREATE
├── dto/
│   ├── create-channel-connection.dto.ts        CREATE
│   └── update-channel-connection.dto.ts        CREATE
└── entities/
    └── channel-connection.entity.ts            REPLACE (full rewrite)

apps/api/src/app.module.ts                      MODIFY — add ChannelsModule
```

---

## Task 1: Install Dependencies

**Files:** `apps/api/package.json` (modified by npm)

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
cd apps/api && npm install node-ical axios && npm install --save-dev @types/node-ical
```

Expected: `node_modules/node-ical` and `node_modules/axios` appear. No errors.

- [ ] **Step 2: Verify types are available**

```bash
ls node_modules/@types/node-ical
```

Expected: directory exists with `index.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install node-ical and axios for channels module"
```

---

## Task 2: Database Migration

**Files:** Supabase MCP `execute_sql` (no local files)

- [ ] **Step 1: Create enum types and table**

Execute via Supabase MCP `execute_sql`:

```sql
CREATE TYPE channel_type AS ENUM ('booking_com','airbnb','expedia','ical','vrbo');
CREATE TYPE channel_status AS ENUM ('active','inactive','error','syncing');

CREATE TABLE channel_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id          UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id              UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  channel              channel_type NOT NULL,
  status               channel_status NOT NULL DEFAULT 'inactive',
  ical_url             TEXT NOT NULL,
  channel_property_id  TEXT,
  last_sync_at         TIMESTAMPTZ,
  last_sync_count      INTEGER NOT NULL DEFAULT 0,
  last_error           TEXT,
  settings             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_channel_connections_tenant   ON channel_connections(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_channel_connections_property ON channel_connections(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_channel_connections_room     ON channel_connections(room_id) WHERE deleted_at IS NULL;
```

- [ ] **Step 2: Verify table exists**

Execute via Supabase MCP `execute_sql`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'channel_connections'
ORDER BY ordinal_position;
```

Expected: 15 columns including `id`, `tenant_id`, `room_id`, `channel`, `status`, `ical_url`, `last_sync_count`, etc.

---

## Task 3: Replace ChannelConnection Entity

**Files:**
- Replace: `apps/api/src/modules/channels/entities/channel-connection.entity.ts`

- [ ] **Step 1: Replace entity file**

`apps/api/src/modules/channels/entities/channel-connection.entity.ts`:
```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ChannelType {
  BOOKING_COM = 'booking_com',
  AIRBNB = 'airbnb',
  EXPEDIA = 'expedia',
  ICAL = 'ical',
  VRBO = 'vrbo',
}

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  SYNCING = 'syncing',
}

@Entity('channel_connections')
export class ChannelConnection extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ type: 'enum', enum: ChannelType })
  channel: ChannelType;

  @Column({ type: 'enum', enum: ChannelStatus, default: ChannelStatus.INACTIVE })
  status: ChannelStatus;

  @Column({ name: 'ical_url' })
  icalUrl: string;

  @Column({ name: 'channel_property_id', nullable: true })
  channelPropertyId: string;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'last_sync_count', default: 0 })
  lastSyncCount: number;

  @Column({ name: 'last_error', nullable: true })
  lastError: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown>;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/channels/entities/channel-connection.entity.ts
git commit -m "feat: replace ChannelConnection entity with import-ready schema"
```

---

## Task 4: Create DTOs

**Files:**
- Create: `apps/api/src/modules/channels/dto/create-channel-connection.dto.ts`
- Create: `apps/api/src/modules/channels/dto/update-channel-connection.dto.ts`

- [ ] **Step 1: Create CreateChannelConnectionDto**

`apps/api/src/modules/channels/dto/create-channel-connection.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { ChannelType } from '../entities/channel-connection.entity';

export class CreateChannelConnectionDto {
  @ApiProperty({ description: 'Property UUID — must belong to current tenant' })
  @IsUUID()
  propertyId: string;

  @ApiProperty({ description: 'Room UUID — must belong to the property and tenant' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChannelType })
  @IsEnum(ChannelType)
  channel: ChannelType;

  @ApiProperty({ description: 'iCal feed URL provided by the OTA for this room' })
  @IsUrl()
  icalUrl: string;

  @ApiPropertyOptional({ description: 'Room or property ID as it appears in the OTA system' })
  @IsOptional()
  @IsString()
  channelPropertyId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  settings?: Record<string, unknown>;
}
```

- [ ] **Step 2: Create UpdateChannelConnectionDto**

`apps/api/src/modules/channels/dto/update-channel-connection.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { ChannelStatus } from '../entities/channel-connection.entity';

export class UpdateChannelConnectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  icalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelPropertyId?: string;

  @ApiPropertyOptional({ enum: ChannelStatus })
  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  settings?: Record<string, unknown>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/channels/dto/
git commit -m "feat: add channel connection DTOs"
```

---

## Task 5: Create ICalImportService

**Files:**
- Create: `apps/api/src/modules/channels/ical-import.service.ts`

- [ ] **Step 1: Create ICalImportService**

`apps/api/src/modules/channels/ical-import.service.ts`:
```typescript
import { Injectable, BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import axios from 'axios';
import * as ical from 'node-ical';
import { randomUUID } from 'crypto';
import { ChannelConnection, ChannelStatus, ChannelType } from './entities/channel-connection.entity';
import { Guest, GuestStatus } from '../guests/entities/guest.entity';
import { Reservation, ReservationSource, ReservationStatus } from '../reservations/entities/reservation.entity';

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ uid: string; reason: string }>;
}

@Injectable()
export class ICalImportService {
  constructor(
    @InjectRepository(ChannelConnection)
    private readonly connRepo: Repository<ChannelConnection>,
    @InjectRepository(Guest)
    private readonly guestRepo: Repository<Guest>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  async importFromConnection(connection: ChannelConnection): Promise<SyncResult> {
    connection.status = ChannelStatus.SYNCING;
    connection.lastError = null;
    await this.connRepo.save(connection);

    let icsString: string;
    try {
      const response = await axios.get<string>(connection.icalUrl, {
        timeout: 10000,
        responseType: 'text',
      });
      icsString = response.data;
    } catch (err: any) {
      const msg = err.code === 'ECONNABORTED' ? 'Fetch timeout' : `HTTP error: ${err.message}`;
      connection.status = ChannelStatus.ERROR;
      connection.lastError = msg;
      await this.connRepo.save(connection);
      throw new BadGatewayException(msg);
    }

    let events: ical.CalendarResponse;
    try {
      events = ical.parseICS(icsString);
    } catch (err: any) {
      const msg = `Parse error: ${err.message}`;
      connection.status = ChannelStatus.ERROR;
      connection.lastError = msg;
      await this.connRepo.save(connection);
      throw new UnprocessableEntityException(msg);
    }

    const result: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const key of Object.keys(events)) {
      const component = events[key] as ical.VEvent;
      if (component.type !== 'VEVENT') continue;

      const uid = component.uid;
      const start = component.start as Date | undefined;
      const end = component.end as Date | undefined;

      if (!uid || !start || !end) {
        result.skipped++;
        result.errors.push({ uid: uid ?? key, reason: 'Missing uid, dtstart, or dtend' });
        continue;
      }

      const checkInDate = this.toDateString(start);
      const checkOutDate = this.toDateString(end);

      try {
        const existing = await this.reservationRepo.findOne({
          where: {
            channelReservationId: uid,
            tenantId: connection.tenantId,
            deletedAt: IsNull(),
          },
        });

        if (existing) {
          if (existing.checkInDate !== checkInDate || existing.checkOutDate !== checkOutDate) {
            existing.checkInDate = checkInDate;
            existing.checkOutDate = checkOutDate;
            await this.reservationRepo.save(existing);
          }
          result.updated++;
        } else {
          const { firstName, lastName } = this.parseGuestName(component.summary, connection.channel);
          const guest = this.guestRepo.create({
            tenantId: connection.tenantId,
            firstName,
            lastName,
            status: GuestStatus.ACTIVE,
            notes: `Auto-importado vía iCal. UID: ${uid}`,
          });
          const savedGuest = await this.guestRepo.save(guest);

          const reservation = this.reservationRepo.create({
            tenantId: connection.tenantId,
            propertyId: connection.propertyId,
            roomId: connection.roomId,
            guestId: savedGuest.id,
            confirmationNumber: this.generateConfirmationNumber(),
            channelReservationId: uid,
            source: this.toReservationSource(connection.channel),
            status: ReservationStatus.CONFIRMED,
            checkInDate,
            checkOutDate,
            baseAmount: 0,
            totalAmount: 0,
            adultsCount: 1,
          });
          await this.reservationRepo.save(reservation);
          result.imported++;
        }
      } catch (err: any) {
        result.errors.push({ uid, reason: err.message });
      }
    }

    connection.status = ChannelStatus.ACTIVE;
    connection.lastSyncAt = new Date();
    connection.lastSyncCount = result.imported + result.updated;
    connection.lastError = null;
    await this.connRepo.save(connection);

    return result;
  }

  private toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private parseGuestName(
    summary: string | undefined,
    channel: ChannelType,
  ): { firstName: string; lastName: string } {
    if (summary) {
      const parts = summary.trim().split(/\s+/);
      if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
      if (parts[0]) return { firstName: parts[0], lastName: this.channelLabel(channel) };
    }
    return { firstName: 'OTA', lastName: this.channelLabel(channel) };
  }

  private channelLabel(channel: ChannelType): string {
    const labels: Record<ChannelType, string> = {
      [ChannelType.BOOKING_COM]: 'Booking.com',
      [ChannelType.AIRBNB]: 'Airbnb',
      [ChannelType.EXPEDIA]: 'Expedia',
      [ChannelType.ICAL]: 'iCal',
      [ChannelType.VRBO]: 'VRBO',
    };
    return labels[channel];
  }

  private toReservationSource(channel: ChannelType): ReservationSource {
    const map: Partial<Record<ChannelType, ReservationSource>> = {
      [ChannelType.BOOKING_COM]: ReservationSource.BOOKING_COM,
      [ChannelType.AIRBNB]: ReservationSource.AIRBNB,
      [ChannelType.EXPEDIA]: ReservationSource.EXPEDIA,
      [ChannelType.ICAL]: ReservationSource.ICAL,
      [ChannelType.VRBO]: ReservationSource.ICAL,
    };
    return map[channel] ?? ReservationSource.ICAL;
  }

  private generateConfirmationNumber(): string {
    return `SH-${Date.now().toString(36).toUpperCase()}-${randomUUID().split('-')[0].toUpperCase()}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/channels/ical-import.service.ts
git commit -m "feat: add ICalImportService with fetch, parse, dedup, and guest placeholder creation"
```

---

## Task 6: Create ChannelConnectionsService

**Files:**
- Create: `apps/api/src/modules/channels/channels.service.ts`

- [ ] **Step 1: Create service**

`apps/api/src/modules/channels/channels.service.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/channels/channels.service.ts
git commit -m "feat: add ChannelConnectionsService with CRUD and sync orchestration"
```

---

## Task 7: Create ChannelsController

**Files:**
- Create: `apps/api/src/modules/channels/channels.controller.ts`

- [ ] **Step 1: Create controller**

`apps/api/src/modules/channels/channels.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChannelConnectionsService } from './channels.service';
import { CreateChannelConnectionDto } from './dto/create-channel-connection.dto';
import { UpdateChannelConnectionDto } from './dto/update-channel-connection.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('v1/channels')
export class ChannelsController {
  constructor(private readonly service: ChannelConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Connect a room to an OTA channel via iCal URL' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateChannelConnectionDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List channel connections (icalUrl excluded)' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('propertyId') propertyId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.service.findAll(user.tenantId, propertyId, roomId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel connection detail (includes icalUrl)' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update channel connection URL or settings' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateChannelConnectionDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete channel connection' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger manual iCal import — creates/updates reservations from OTA feed' })
  sync(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.sync(user.tenantId, id);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/channels/channels.controller.ts
git commit -m "feat: add ChannelsController with CRUD and sync endpoints"
```

---

## Task 8: Create ChannelsModule

**Files:**
- Create: `apps/api/src/modules/channels/channels.module.ts`

- [ ] **Step 1: Create module**

`apps/api/src/modules/channels/channels.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelConnection } from './entities/channel-connection.entity';
import { ChannelsController } from './channels.controller';
import { ChannelConnectionsService } from './channels.service';
import { ICalImportService } from './ical-import.service';
import { Guest } from '../guests/entities/guest.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Room } from '../properties/entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConnection, Guest, Reservation, Room])],
  controllers: [ChannelsController],
  providers: [ChannelConnectionsService, ICalImportService],
  exports: [ChannelConnectionsService],
})
export class ChannelsModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/channels/channels.module.ts
git commit -m "feat: add ChannelsModule wiring all providers and repositories"
```

---

## Task 9: Register ChannelsModule in AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add import**

In `apps/api/src/app.module.ts`, add after the existing imports:

```typescript
import { ChannelsModule } from './modules/channels/channels.module';
```

And add `ChannelsModule` to the `imports` array after `PaymentsModule`:

```typescript
    PaymentsModule,
    ChannelsModule,
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat: register ChannelsModule in AppModule"
```

---

## Task 10: Build Verification

- [ ] **Step 1: Build**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npm run build 2>&1
```

Expected: exits with code 0, no TypeScript errors. `dist/` updated.

- [ ] **Step 2: Check routes are registered**

The running server (already on port 3001) needs a restart to pick up the new module. Kill and restart:

```bash
pkill -f "nest start" || true
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npm run start:dev &
sleep 8 && curl -s http://localhost:3001/docs-json | grep -o '"\/api\/v1\/channels[^"]*"' | sort -u
```

Expected output includes:
```
"/api/v1/channels"
"/api/v1/channels/{id}"
"/api/v1/channels/{id}/sync"
```

- [ ] **Step 3: Smoke test — create connection**

First get a JWT (replace with current token if needed):
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hoteltravertino.com","password":"Admin123!"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."
```

Get an existing room ID:
```bash
ROOM_ID=$(curl -s http://localhost:3001/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PROPERTY_ID=$(curl -s http://localhost:3001/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" | grep -o '"propertyId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Room: $ROOM_ID, Property: $PROPERTY_ID"
```

Create a channel connection with a mock iCal URL (will fail on sync, but connection should create):
```bash
curl -s -X POST http://localhost:3001/api/v1/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"propertyId\":\"$PROPERTY_ID\",\"roomId\":\"$ROOM_ID\",\"channel\":\"booking_com\",\"icalUrl\":\"https://calendar.google.com/calendar/ical/example%40gmail.com/public/basic.ics\"}"
```

Expected: `201` with JSON including `id`, `channel: "booking_com"`, `status: "inactive"` — and NO `icalUrl` field in the list endpoint.

- [ ] **Step 4: Smoke test — list excludes icalUrl**

```bash
curl -s http://localhost:3001/api/v1/channels \
  -H "Authorization: Bearer $TOKEN"
```

Expected: array with connection objects — no `icalUrl` field present.

- [ ] **Step 5: Smoke test — detail includes icalUrl**

```bash
CONN_ID=$(curl -s http://localhost:3001/api/v1/channels \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

curl -s http://localhost:3001/api/v1/channels/$CONN_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected: object WITH `icalUrl` field visible.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Channels module — OTA connection management + iCal import"
```
