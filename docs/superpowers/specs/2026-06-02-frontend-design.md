# StayHub Frontend — Design Spec

**Date:** 2026-06-02
**Scope:** Next.js web app — full hotel management UI with real-time quotation and PDF generation
**Status:** Approved by user

---

## What We Are Building

A dark-professional hotel management frontend for StayHub. Hotel staff use it to manage reservations, view room availability, and generate PDF quotations for guests — all connected to the existing NestJS backend.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| HTTP client | Axios (same as backend) |
| PDF generation | @react-pdf/renderer (client-side) |
| State | React Context + SWR for server state |
| Fonts | Fira Sans + Fira Code (Google Fonts) |

**Location:** `apps/web/` (monorepo alongside `apps/api/`)

---

## Design System

### Colors
```
Background:     #080c12  (main)
Surface:        #0d1117  (sidebar, header)
Card:           #0f1520  (cards, tables)
Border:         #1a2535
Primary:        #0f766e  (teal — buttons, active states)
Primary light:  #14b8a6
Text primary:   #ffffff
Text secondary: #ccc
Text muted:     #4a5a6c
Badge green:    bg #0f766e22 · text #0f766e
Badge blue:     bg #0369a122 · text #38bdf8
Badge orange:   bg #d9770622 · text #fb923c
Badge red:      bg #dc262622 · text #f87171
Badge gray:     bg #1a2535   · text #4a5a6c
```

### Typography
- **UI text:** Fira Sans (300, 400, 500, 600, 700)
- **Numbers/codes:** Fira Code (monospace — prices, IDs, dates)

### Layout
- **Sidebar:** 56px wide, icon-only navigation with active indicator (3px teal bar on left)
- **Content:** flex-1, scrollable per section
- **Header per section:** section title + action buttons

---

## Application Structure

```
apps/web/
├── app/
│   ├── layout.tsx                 — root layout, font loading, auth provider
│   ├── login/page.tsx             — login screen
│   ├── (dashboard)/
│   │   ├── layout.tsx             — sidebar + content shell
│   │   ├── page.tsx               — dashboard (redirect to /reservations)
│   │   ├── reservations/
│   │   │   ├── page.tsx           — reservations list
│   │   │   └── new/page.tsx       — new reservation form + quotation panel
│   │   ├── calendar/page.tsx      — room/date calendar view
│   │   ├── rooms/page.tsx         — room status grid
│   │   └── channels/page.tsx      — OTA channel connections
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── dashboard/
│   │   ├── StatsGrid.tsx
│   │   ├── RevenueChart.tsx
│   │   └── RecentReservations.tsx
│   ├── reservations/
│   │   ├── ReservationTable.tsx
│   │   ├── ReservationForm.tsx    — left panel (inputs)
│   │   └── QuotationPanel.tsx     — right panel (live price + PDF)
│   ├── calendar/
│   │   └── RoomCalendar.tsx
│   ├── rooms/
│   │   └── RoomGrid.tsx
│   ├── channels/
│   │   └── ChannelList.tsx
│   └── pdf/
│       └── QuotationDocument.tsx  — @react-pdf/renderer template
├── lib/
│   ├── api.ts                     — axios instance with auth headers + refresh
│   ├── auth.tsx                   — AuthContext (token storage, login, logout)
│   └── utils.ts                   — formatPrice, formatDate, calcNights, etc.
└── types/
    └── index.ts                   — shared TypeScript types mirroring backend entities
```

---

## Screens

### 1. Login
- Email + password form
- Calls `POST /api/v1/auth/login`
- Stores `accessToken` + `refreshToken` in localStorage
- Redirects to `/reservations`

### 2. Dashboard
Stats grid (4 cards):
- Ocupación hoy (%)
- Ingresos del mes ($)
- Check-ins hoy (count)
- Reservas pendientes (count)

Below: revenue line chart (last 30 days) + table of last 5 reservations + upcoming check-ins list.

### 3. Reservations list
- Table: Confirmation # · Guest · Room · Check-in · Check-out · Status badge · Amount
- Filter chips: Todos / Confirmadas / Check-in hoy / Pendientes / Canceladas
- Search input (guest name or confirmation #)
- "Nueva reserva" button → `/reservations/new`

### 4. New Reservation — Two-panel layout

**Left panel — form:**
1. Guest search (typeahead against `GET /api/v1/guests?search=`) or "Crear huésped"
2. Property selector (if tenant has multiple)
3. Room selector (shows available rooms for selected dates)
4. Check-in date / Check-out date (date pickers)
5. Adults + children count
6. **¿Requiere factura?** toggle (OFF by default)
7. Notes (optional textarea)

**Right panel — live quotation:**
Updates on every field change:
```
Habitación Doble (204)          3 noches
─────────────────────────────────────────
$120/noche × 3 noches           $360.00

✓ Desayuno incluido
✓ Estacionamiento gratuito
─────────────────────────────────────────
TOTAL (sin impuestos)           $360.00

── Solo si "Requiere factura" ──
IVA (21%)                        $75.60
Total con factura               $435.60
```
- "Descargar cotización PDF" button (client-side, no API call)
- "Confirmar reserva" button → `POST /api/v1/reservations`

### 5. Calendar view
- Horizontal: dates (next 14 days, scrollable)
- Vertical: rooms
- Cells: colored blocks per reservation (teal = confirmed, blue = checked-in, gray = blocked)
- Click cell → reservation detail drawer

### 6. Rooms grid
- Grid of room cards by status:
  - Disponible (teal)
  - Ocupada (blue)
  - Limpieza (orange)
  - Mantenimiento (red)
- Click room → update status

### 7. Channels
- List of OTA channel connections
- Per connection: channel name, room, status badge, last sync time
- "Sincronizar" button → `POST /api/v1/channels/:id/sync`
- "Nueva conexión" → form (OTA type, room, iCal URL)

---

## Quotation PDF (Canva template match)

Generated client-side with `@react-pdf/renderer`. Page size: A4 portrait (794×1123px). Background: black (`#000000`). Text: white.

**Exact layout (top to bottom):**

```
┌─────────────────────────────────────────────┐  BLACK BG
│                                              │
│          HOTEL TRAVERTINO  (small, gray)     │
│            COTIZACIÓN      (large, bold)     │
│                                              │
│  FECHA: 10 - 13 JUNIO 2026   DESAYUNO INCLUIDO    │
│  NOCHES: 3                   [si factura:]        │
│  HUÉSPED: M. GONZÁLEZ        IMPUESTOS (21%): $X  │
│            · 2 ADULTOS       TOTAL C/IMP: $X      │
│                                              │
│  ─────────────────────────────────────────  │
│                  RESERVA                     │
│  ─────────────────────────────────────────  │
│                                              │
│  HABITACIÓN    PRECIO X NOCHE   PRECIO TOTAL│
│                                              │
│  DOBLE (HAB. 204)    $120        $360 🟡     │
│                                              │
│  (espacio para filas adicionales)            │
│                                              │
│                                              │
│  ─────────────────────────────────────────  │
│        T R A V E R T I N O  (logo)          │
│  ─────────────────────────────────────────  │
│           987-175-2310                       │
│          @HOTELTRAVERTINO                    │
│     C. 68 439, CENTRO, 97000 MÉRIDA, YUC.   │
└─────────────────────────────────────────────┘
```

**Color details:**
- PRECIO TOTAL value: golden/teal accent (`#e8a94a` or teal from brand)
- Divider lines: white at low opacity
- Hotel name in header: small gray caps
- COTIZACIÓN: large bold white

**Data sources:**
- Hotel name, phone, address, social → `GET /v1/tenants/:id`
- Guest name + adults → from reservation form
- Dates + nights → calculated from checkIn/checkOut
- Room type + room number + price/night → from selected room
- "Desayuno incluido" → always shown (fixed amenity)
- IVA + total con impuestos → only shown if "Requiere factura" toggle is ON
- Tax rate → 21% hardcoded (configurable later)

---

## Pricing Model

- **Base price** = price WITHOUT taxes (what the hotel charges)
- **Taxes (21% IVA)** = only shown/applied when guest requests a formal invoice (factura)
- **Included amenities** = shown as informational badges, not charges (e.g. "Desayuno incluido", "Estacionamiento gratuito")

The reservation form has a **"¿Requiere factura?"** toggle:
- OFF → quotation shows base total only
- ON → quotation shows base total + IVA (21%) + total con impuestos

This matches the Canva template exactly: taxes and total-with-taxes appear in the top-right info block only when applicable.

---

## Auth Flow

1. `POST /api/v1/auth/login` → store `accessToken` + `refreshToken` in localStorage
2. Axios interceptor attaches `Authorization: Bearer <token>` to every request
3. On 401 → attempt `POST /api/v1/auth/refresh` → retry original request
4. On refresh failure → redirect to `/login`

---

## API Integration

All calls go to `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001`).

Key endpoints used:
- `POST /v1/auth/login` + `POST /v1/auth/refresh`
- `GET /v1/tenants/:id` — hotel name, phone, address for PDF header
- `GET /v1/reservations` + `POST /v1/reservations`
- `GET /v1/guests?search=` + `POST /v1/guests`
- `GET /v1/properties` + `GET /v1/rooms?propertyId=`
- `GET /v1/room-types?propertyId=`
- `GET /v1/channels` + `POST /v1/channels` + `POST /v1/channels/:id/sync`

---

## Out of Scope (Phase 1)

- Mobile responsive layout
- Dark/light mode toggle
- Notifications module UI
- Reports/analytics beyond dashboard stats
- Multi-language (Spanish only)
- Configurable extras prices via UI (hardcoded)
- Configurable tax rate via UI (hardcoded 21%)
