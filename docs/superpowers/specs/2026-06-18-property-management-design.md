# Property Management & Selector — Design Spec

**Date:** 2026-06-18  
**Status:** Approved

---

## Problem

The app has a full `properties` API module but no UI to create, edit, or switch between properties. Users have no way to manage their hotels from the interface.

---

## Solution Overview

Add a `PropertyContext` for global active-property state, a property selector in the sidebar, a `/settings/properties` management page, and integrate the active property into all existing data pages.

---

## Section 1 — PropertyContext

A new `PropertyContext` wraps the dashboard layout. On mount it:

1. Calls `GET /api/v1/properties` to fetch all tenant properties
2. Reads `activePropertyId` from `localStorage`
3. Auto-selects the first property if nothing is stored
4. Exposes: `activeProperty`, `properties`, `switchProperty(id)`, `refetch()`

A `useProperty()` hook provides access to this context from any page or component.

**Empty state:** If the tenant has no properties, `activeProperty` is `null` and all data pages show a CTA to `/settings/properties`.

---

## Section 2 — Sidebar Property Selector

Positioned below the "S" logo in the sidebar.

- Shows abbreviated active property name + chevron icon
- Click opens a popover with:
  - List of tenant properties (checkmark on active)
  - Separator
  - "+ Nueva propiedad" button → navigates to `/settings/properties`
- Switching property updates context and persists to `localStorage`

**Plan limits:**
| Plan | Max properties |
|------|---------------|
| starter | 1 |
| professional | 5 |
| enterprise | unlimited |

If at the plan limit, the "+ Nueva propiedad" button is disabled with a tooltip explaining the upgrade requirement. If the tenant has only 1 property, the selector renders but without a dropdown.

---

## Section 3 — `/settings/properties` Page

Lists all tenant properties as cards showing: name, type, city, status badge.

Each card has Edit and Delete actions (Delete only for super_admin).

"Nueva propiedad" button opens a modal with:

**Required fields:**
- Name
- Type: hotel / hostel / boutique / apartamento / vacation_rental

**Optional fields:**
- Address, city, country
- Phone, email
- Check-in time, check-out time

If the tenant is at their plan limit, the "Nueva propiedad" button is disabled and a banner explains the plan restriction.

---

## Section 4 — Existing Pages Integration

Pages affected: Habitaciones, Calendario, Reservas, Canales.

Each reads `activeProperty.id` from `useProperty()` and passes it as `?propertyId=xxx` to API calls.

If `activeProperty` is `null` (no properties exist), the page shows an empty state with a button linking to `/settings/properties`.

---

## Section 5 — Role Permissions

| Feature | admin | super_admin |
|---------|-------|-------------|
| View property selector | ✅ | ✅ |
| Create / edit properties | ✅ | ✅ |
| Delete properties | ❌ | ✅ |
| `/settings/properties` | ✅ | ✅ |
| `/settings/team` | ❌ | ✅ |

Settings icon in sidebar is visible to both `admin` and `super_admin`. `/settings/team` returns 403 for non-super_admin users.

---

## Files to Create / Modify

**Web:**
- `lib/property-context.tsx` — new context + hook
- `components/layout/Sidebar.tsx` — add property selector
- `app/(dashboard)/layout.tsx` — wrap with PropertyProvider
- `app/(dashboard)/settings/properties/page.tsx` — new page
- `app/(dashboard)/rooms/page.tsx` — consume activeProperty
- `app/(dashboard)/calendar/page.tsx` — consume activeProperty
- `app/(dashboard)/reservations/page.tsx` — consume activeProperty
- `app/(dashboard)/channels/page.tsx` — consume activeProperty

**No API changes needed** — properties CRUD already exists at `GET/POST/PUT/DELETE /api/v1/properties`.
