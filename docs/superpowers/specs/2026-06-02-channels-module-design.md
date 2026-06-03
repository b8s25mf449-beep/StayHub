# StayHub — Channels Module Design (Phase 1)

**Date:** 2026-06-02
**Scope:** Channels module — OTA connection management + iCal export
**Status:** Approved by user

---

## What We Are Building

A Channels module that lets hotel staff connect their properties to OTA channels (Booking.com, Airbnb, Expedia, VRBO, iCal) and expose per-property iCal feeds that OTAs can subscribe to for availability blocking.

**Out of scope for Phase 1:**
- Real OTA API calls (Booking.com API, Airbnb API, etc.)
- iCal import (inbound sync)
- Credential encryption (stored as-is with a TODO marker)
- Rate limiting on the public iCal endpoint

---

## Architecture

Two surfaces:

**Protected surface** (JWT required) — `/api/v1/channels`
Manages `channel_connections` rows: which OTA is connected to which property, connection status, settings, and token lifecycle.

**Public surface** (no JWT) — `/ical/:token`
Generates and returns a live RFC 5545-compliant `.ics` feed scoped to the property linked to the token. OTAs subscribe to this URL directly; no authentication header is needed or accepted.

Two services:
- `ChannelConnectionsService` — CRUD + token management
- `ICalService` — queries reservations and builds the `.ics` string

---

## Data Model

### New DB migration

```sql
-- Enum types for channels
CREATE TYPE channel_type AS ENUM ('booking_com','airbnb','expedia','ical','vrbo');
CREATE TYPE channel_status AS ENUM ('active','inactive','error','syncing');

-- Create channel_connections table
CREATE TABLE channel_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel               channel_type NOT NULL,
  status                channel_status NOT NULL DEFAULT 'inactive',
  credentials_encrypted TEXT,
  channel_property_id   TEXT,
  ical_token            TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  last_sync_at          TIMESTAMPTZ,
  last_error            TEXT,
  settings              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_channel_connections_tenant    ON channel_connections(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_channel_connections_property  ON channel_connections(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_channel_connections_token     ON channel_connections(ical_token) WHERE deleted_at IS NULL;
```

### Entity update

Add `icalToken` to the existing `ChannelConnection` entity with a `@BeforeInsert` hook:

```typescript
@Column({ name: 'ical_token', unique: true })
icalToken: string;

@BeforeInsert()
generateToken() {
  this.icalToken = require('crypto').randomBytes(32).toString('hex');
}
```

---

## API Endpoints

### Protected (`/api/v1/channels`, JWT required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/channels` | Create channel connection |
| `GET` | `/v1/channels` | List connections (optional `?propertyId=`) |
| `GET` | `/v1/channels/:id` | Get single connection |
| `PATCH` | `/v1/channels/:id` | Update status / settings |
| `DELETE` | `/v1/channels/:id` | Soft-delete (token stops working) |
| `POST` | `/v1/channels/:id/regenerate-token` | Rotate iCal token |

### Public (`no JWT`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ical/:token` | Returns `.ics` feed for the property |

The iCal controller uses `@Controller('ical')` under the global `/api` prefix but with `VERSION_NEUTRAL` so no `v1` is prepended — keeping the URL short and stable for OTA subscriptions.

Response: `Content-Type: text/calendar; charset=utf-8`

---

## DTOs

**`CreateChannelConnectionDto`**
```typescript
{
  propertyId: string;      // UUID
  channel: ChannelType;    // booking_com | airbnb | expedia | ical | vrbo
  channelPropertyId?: string;
  credentials?: string;    // stored as-is in Phase 1 (TODO: encrypt in Phase 2)
  settings?: Record<string, unknown>;
}
```

**`UpdateChannelConnectionDto`** — Partial of CreateChannelConnectionDto plus:
```typescript
{
  status?: ChannelStatus;  // active | inactive | error | syncing
  lastError?: string;
}
```

---

## iCal Feed Format (RFC 5545)

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StayHub//StayHub Calendar//EN
X-WR-CALNAME:Property Name - Channel Name
BEGIN:VEVENT
UID:{confirmationNumber}@stayhub
SUMMARY:Blocked - {firstName} {lastName}
DTSTART;VALUE=DATE:{YYYYMMDD}
DTEND;VALUE=DATE:{YYYYMMDD}
DTSTAMP:{YYYYMMDDTHHmmssZ}
STATUS:CONFIRMED
END:VEVENT
...
END:VCALENDAR
```

**Included reservations:** `confirmed`, `checked_in`, `pending` — excludes `cancelled`, `no_show`, `checked_out`, `inquiry`.

**All-day events** (`VALUE=DATE`) — standard for hotel blocking, compatible with all major OTAs.

**UID** — `{confirmationNumber}@stayhub` — stable across repeated syncs (OTAs use this to deduplicate).

---

## Security

- **Token format:** 64-char hex string from `crypto.randomBytes(32)` — not guessable
- **Invalid token response:** `404 Not Found` — no information leakage (no "token revoked" message)
- **Token regeneration:** `POST /v1/channels/:id/regenerate-token` replaces the old token atomically; old URL stops working immediately
- **Tenant isolation:** iCal endpoint looks up connection by token → gets `propertyId` → queries reservations filtered by `propertyId`. No cross-tenant access possible.
- **Soft delete:** deleted connections return 404 on iCal endpoint (`deleted_at IS NULL` index filter)
- **Credentials:** Stored as plaintext in Phase 1 with `// TODO Phase 2: encrypt with AES-256-GCM` comment. Only used for future OTA API integrations, not exposed in any response.

---

## File Map

```
apps/api/src/modules/channels/
├── channels.module.ts
├── channels.controller.ts        (protected CRUD + regenerate-token)
├── ical.controller.ts            (public /ical/:token endpoint, @Public())
├── channels.service.ts
├── ical.service.ts
├── dto/
│   ├── create-channel-connection.dto.ts
│   └── update-channel-connection.dto.ts
└── entities/
    └── channel-connection.entity.ts  (add icalToken + @BeforeInsert)
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Token not found / deleted | `404 Not Found` |
| Property not found (data inconsistency) | `404 Not Found` |
| Channel connection not in tenant | `404 Not Found` |
| Invalid DTO on create/update | `400 Bad Request` (class-validator) |
| Duplicate channel+property combo | No constraint — multiple connections allowed (e.g., two Booking.com accounts) |

---

## Testing (manual smoke test)

1. Create a channel connection via `POST /v1/channels` → receive `id` and `icalToken`
2. Create a reservation for the linked property
3. `GET /ical/{token}` → verify `.ics` contains the reservation as a VEVENT
4. `POST /v1/channels/:id/regenerate-token` → old token returns 404, new token works
5. `DELETE /v1/channels/:id` → both old and new tokens return 404 on `/api/ical/:token`
