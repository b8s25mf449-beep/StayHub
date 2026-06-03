# StayHub — Channels Module Design (Phase 1)

**Date:** 2026-06-02
**Scope:** Channels module — OTA connection management + iCal import
**Status:** Approved by user

---

## What We Are Building

A Channels module that lets hotel staff connect individual rooms to OTA channels (Booking.com, Airbnb, Expedia, VRBO) via iCal import. Staff pastes the OTA-generated `.ics` URL per room, then triggers a sync. StayHub fetches the feed, parses it, and automatically creates/updates reservations.

**Out of scope for Phase 1:**
- iCal export (StayHub → OTA direction)
- Real OTA API calls
- Scheduled/automatic sync (manual trigger only)
- URL authentication (basic auth, token params)
- Credential encryption

---

## Architecture

**One surface** (all endpoints JWT-protected) — `/api/v1/channels`

Manages `channel_connections` rows: which room is connected to which OTA channel, stores the OTA-provided iCal URL, and tracks sync state.

`POST /v1/channels/:id/sync` triggers the import flow:
1. `ChannelConnectionsService` loads the connection and validates tenant ownership
2. `ICalImportService` fetches the URL, parses the `.ics`, and for each VEVENT creates or updates a reservation — skipping ones that already exist by `channelReservationId`

Two services:
- `ChannelConnectionsService` — CRUD + sync orchestration
- `ICalImportService` — fetch, parse, deduplicate, create guest + reservation

---

## Data Model

### DB Migration

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

### Entity (`channel-connection.entity.ts`) — full replacement

```typescript
@Entity('channel_connections')
export class ChannelConnection extends BaseEntity {
  @Column({ name: 'tenant_id' })        tenantId: string;
  @Column({ name: 'property_id' })      propertyId: string;
  @Column({ name: 'room_id' })          roomId: string;
  @Column({ type: 'enum', enum: ChannelType })   channel: ChannelType;
  @Column({ type: 'enum', enum: ChannelStatus, default: ChannelStatus.INACTIVE }) status: ChannelStatus;
  @Column({ name: 'ical_url' })         icalUrl: string;
  @Column({ name: 'channel_property_id', nullable: true }) channelPropertyId: string;
  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true }) lastSyncAt: Date;
  @Column({ name: 'last_sync_count', default: 0 }) lastSyncCount: number;
  @Column({ name: 'last_error', nullable: true }) lastError: string;
  @Column({ type: 'jsonb', nullable: true }) settings: Record<string, unknown>;
}
```

### Existing tables used (no changes needed)

| Table | Fields used |
|-------|-------------|
| `reservations` | `channelReservationId` (dedup UID), `source` (channel type), `guestId`, `roomId`, `propertyId` |
| `guests` | Auto-created placeholder per new VEVENT |

---

## API Endpoints

All require JWT. Base path: `/api/v1/channels`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/channels` | Create connection (paste OTA iCal URL) |
| `GET` | `/v1/channels` | List connections (`?propertyId=`, `?roomId=`) |
| `GET` | `/v1/channels/:id` | Get connection detail |
| `PATCH` | `/v1/channels/:id` | Update URL / settings / status |
| `DELETE` | `/v1/channels/:id` | Soft-delete |
| `POST` | `/v1/channels/:id/sync` | Trigger manual iCal import |

### Sync response

```json
{
  "imported": 3,
  "updated": 1,
  "skipped": 0,
  "errors": [
    { "uid": "abc123", "reason": "Missing dtstart" }
  ]
}
```

---

## DTOs

**`CreateChannelConnectionDto`**
```typescript
{
  propertyId: string;       // UUID — validated belongs to tenant
  roomId: string;           // UUID — validated belongs to property + tenant
  channel: ChannelType;     // booking_com | airbnb | expedia | ical | vrbo
  icalUrl: string;          // URL of OTA iCal feed (IsUrl validator)
  channelPropertyId?: string;
  settings?: Record<string, unknown>;
}
```

**`UpdateChannelConnectionDto`** — PartialType of Create plus:
```typescript
{
  status?: ChannelStatus;
}
```

**`ChannelConnectionResponseDto`** — excludes `icalUrl` from list responses (security: URL may contain tokens).

---

## ICalImportService — Import Flow

**Library:** `node-ical` (RFC 5545 parser, well-maintained).

**Step-by-step:**

```
1. SET status = syncing, clear lastError
2. FETCH icalUrl (10s timeout via axios/node-fetch)
   → on network error: status = error, lastError = message, throw
3. PARSE .ics string via ical.parseICS()
4. FILTER: only VEVENT components (skip VTIMEZONE, VCALENDAR meta)
5. FOR each VEVENT:
   a. Extract: uid, dtstart, dtend, summary
   b. Validate: skip if missing uid/dtstart/dtend → add to errors[]
   c. FIND existing reservation WHERE channelReservationId = uid AND tenantId = X
      → EXISTS: update checkInDate/checkOutDate if changed → count as "updated"
      → NOT EXISTS:
         i.  Parse guest name from SUMMARY (split on ' ' or use defaults)
         ii. CREATE guest placeholder (tenantId, firstName, lastName, notes)
         iii.GENERATE confirmationNumber
         iv. CREATE reservation (all fields below)
         → count as "imported"
6. UPDATE channel_connection:
   lastSyncAt = now(), lastSyncCount = imported + updated,
   status = active, lastError = null
7. RETURN { imported, updated, skipped, errors }
```

**Reservation created from VEVENT:**

```typescript
{
  tenantId,
  propertyId,
  roomId,                           // from channel_connection
  guestId,                          // newly created placeholder
  confirmationNumber,               // SH-XXXX-YYYY (same generator)
  channelReservationId: uid,        // VEVENT UID — dedup key
  source: connection.channel,       // booking_com | airbnb | etc.
  status: ReservationStatus.CONFIRMED,
  checkInDate: dtstart,
  checkOutDate: dtend,
  baseAmount: 0,                    // iCal carries no pricing
  totalAmount: 0,
  taxesAmount: 0,
  adultsCount: 1,
}
```

**Guest placeholder:**

```typescript
{
  tenantId,
  firstName: parsedFirst || 'OTA',
  lastName: parsedLast || channelLabel,  // e.g. 'Booking.com'
  notes: `Auto-importado vía iCal. UID: ${uid}`,
  status: GuestStatus.ACTIVE,
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Fetch timeout (>10s) | `status = error`, `lastError = "Fetch timeout"`, 502 response |
| HTTP error (404, 403) | `status = error`, `lastError = "HTTP {status}"`, 502 response |
| iCal parse failure | `status = error`, `lastError = "Parse error: ..."`, 422 response |
| VEVENT missing uid/dates | Skipped, added to `errors[]` array — sync continues |
| Guest create failure | That VEVENT skipped with error message — sync continues |
| Reservation create failure | That VEVENT skipped with error message — sync continues |
| Room/property not in tenant | `403 Forbidden` at connection creation time |

Errors within a sync are per-VEVENT (no global rollback) — partial imports succeed.

---

## Security

- `icalUrl` excluded from list/get responses — may contain OTA-issued secret tokens in the URL
- `propertyId` and `roomId` validated to belong to the requesting tenant on create
- All CRUD and sync operations scope by `tenantId` from JWT — no cross-tenant access possible
- No public endpoints — all routes require Bearer token

---

## File Map

```
apps/api/src/modules/channels/
├── channels.module.ts
├── channels.controller.ts
├── channels.service.ts
├── ical-import.service.ts
├── dto/
│   ├── create-channel-connection.dto.ts
│   └── update-channel-connection.dto.ts
└── entities/
    └── channel-connection.entity.ts    (replace existing)
```

---

## Manual Smoke Test

1. Create a room and property via existing endpoints
2. `POST /v1/channels` with a real Booking.com iCal URL and `roomId`
3. `POST /v1/channels/:id/sync` → verify response shows `imported: N`
4. `GET /v1/reservations` → verify N reservations exist with `source = booking_com`
5. Re-run sync → response shows `updated: 0, imported: 0` (dedup working)
6. Manually change a VEVENT date in a mock `.ics` → re-sync → `updated: 1`
7. `DELETE /v1/channels/:id` → connection soft-deleted, existing reservations preserved

---

## Dependencies to Install

```bash
npm install node-ical axios
npm install --save-dev @types/node-ical
```
