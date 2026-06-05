# Roles & Team Management — Design Spec

**Date:** 2026-06-05
**Scope:** Backend API + Frontend UI for creating users and assigning fixed roles in StayHub PMS.
**Constraint:** Only `super_admin` can create users and assign roles.

---

## Overview

Three fixed system roles exist in the tenant. `super_admin` manages users from a new `/settings/team` page. No custom role creation — roles are seeded and immutable from the UI.

| Role | Description |
|---|---|
| `super_admin` | Full access. Manages users and roles. Cannot be assigned via UI. |
| `admin` | Property manager. Full reservation/guest/room/payment access. Read-only on users and properties. |
| `usuario` | Receptionist. Create and view reservations, read-only guests/rooms/payments. |

---

## Backend

### 1. Permissions Seed

A seed ensures the following permissions exist in the `permissions` table, then creates the 3 system roles with `isSystem: true` if they don't exist.

**Permissions matrix:**

| Permission | super_admin | admin | usuario |
|---|---|---|---|
| reservations:read | ✓ | ✓ | ✓ |
| reservations:write | ✓ | ✓ | ✓ |
| guests:read | ✓ | ✓ | ✓ |
| guests:write | ✓ | ✓ | — |
| rooms:read | ✓ | ✓ | ✓ |
| rooms:write | ✓ | ✓ | — |
| payments:read | ✓ | ✓ | ✓ |
| payments:write | ✓ | ✓ | — |
| users:read | ✓ | ✓ | — |
| users:write | ✓ | — | — |
| properties:read | ✓ | ✓ | — |
| properties:write | ✓ | — | — |
| tenants:read | ✓ | — | — |
| tenants:write | ✓ | — | — |

### 2. RolesController

`GET /api/v1/roles`
- Returns all roles for the tenant excluding `super_admin`.
- Protected by JWT. No special role guard needed (read-only, used to populate role selector).
- Response: `{ id, name, description }[]`

### 3. UsersController extensions

All write endpoints protected by a new `@RequireRole('super_admin')` decorator + `RoleGuard`.

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | — | List all tenant users with roles and status |
| `POST` | `/api/v1/users` | `CreateUserDto` | Create user (already exists, now guarded) |
| `PATCH` | `/api/v1/users/:id/role` | `{ roleId: string }` | Replace user's roles with the single given role |
| `PATCH` | `/api/v1/users/:id/status` | `{ status: 'active' \| 'suspended' }` | Suspend or reactivate |
| `DELETE` | `/api/v1/users/:id` | — | Soft-delete (already exists, now guarded) |

**Business rules enforced in service:**
- A user cannot change their own role or status (checked via `CurrentUser` vs `id` param).
- Cannot assign `super_admin` role via PATCH.
- Email uniqueness already enforced by existing `create`.

### 4. RoleGuard

New `src/common/guards/role.guard.ts`. Reads `@RequireRole(roleName)` metadata, checks `user.roles.includes(roleName)` from JWT payload. Returns `403` if not satisfied.

### 5. New files

```
src/modules/users/
  roles.controller.ts        ← GET /api/v1/roles
  roles.service.ts           ← findAll(tenantId), excludes super_admin
  dto/change-role.dto.ts     ← { roleId: string }
  dto/change-status.dto.ts   ← { status: UserStatus }

src/database/seeds/
  roles.seed.ts              ← idempotent seed for permissions + 3 system roles

src/common/guards/
  role.guard.ts              ← @RequireRole decorator + guard

src/common/decorators/
  require-role.decorator.ts  ← SetMetadata('role', roleName)
```

---

## Frontend

### 1. Sidebar

In `Sidebar.tsx`, add a `Settings` icon (lucide `Settings`) to the footer section, rendered only when `user?.roles?.includes('super_admin')`. Links to `/settings/team`.

### 2. Route guard

`app/(dashboard)/settings/layout.tsx` — checks `user.roles.includes('super_admin')` on mount; redirects to `/` if not. Uses same pattern as `DashboardLayout`.

### 3. `/settings/team` page

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Equipo                        [+ Nuevo usuario] │
│ Gestión de usuarios y roles del hotel           │
├─────────────────────────────────────────────┤
│ USUARIO        EMAIL         ROL      ESTADO  ··· │
│ Juan García    juan@...    [admin]   ● activo  ··· │
│ Ana López      ana@...     [usuario] ● activo  ··· │
│ Carlos Ruiz    carlos@...  [usuario] ○ suspendido ··· │
└─────────────────────────────────────────────┘
```

**Role badges:**
- `admin` → teal background (`bg-[#0f766e22] text-primary border border-[#0f766e33]`)
- `usuario` → muted (`bg-card text-muted border border-border`)

**Status indicator:**
- Active → `w-1.5 h-1.5 rounded-full bg-emerald-500`
- Suspended → `w-1.5 h-1.5 rounded-full bg-[#fb923c]`
- Row is `opacity-50` when suspended.

**Row action menu (··· button, visible on row hover):**
- Cambiar rol → inline dropdown replacing the role badge
- Suspender / Reactivar → calls PATCH status
- — separator —
- Eliminar → confirmation inline, calls DELETE

**Cannot act on self:** own row has no ··· menu.

### 4. Drawer "Nuevo usuario"

Slides in from right (`animate-slide-in-right`). Backdrop `bg-black/50 backdrop-blur-sm`.

Fields:
- Nombre (required)
- Apellido (required)
- Email (required)
- Contraseña temporal (required, min 8 chars)
- Rol — `<select>`: Admin / Usuario

Submit calls `POST /api/v1/users`. On success: closes drawer, SWR mutates user list. On conflict (email exists): inline error under email field.

### 5. New frontend files

```
app/(dashboard)/settings/
  layout.tsx                 ← super_admin guard + redirect
  team/
    page.tsx                 ← main team management page

components/settings/
  UserTable.tsx              ← table with hover actions
  UserRow.tsx                ← single row, role badge, status dot, menu
  NewUserDrawer.tsx          ← slide-in drawer for user creation
```

### 6. Types

Extend `types/index.ts`:
```ts
export interface UserWithRoles {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  roles: { id: string; name: string }[];
  lastLoginAt?: string;
}
```

---

## Data Flow

```
Page load:
  GET /api/v1/users   → user list with roles/status
  GET /api/v1/roles   → role options for selectors (admin, usuario only)

Create user:
  POST /api/v1/users  → { firstName, lastName, email, password, roleIds: [id] }
  → SWR mutate

Change role (optimistic):
  PATCH /api/v1/users/:id/role  → { roleId }
  → update local state immediately, revert on error

Suspend / Reactivate:
  PATCH /api/v1/users/:id/status → { status }
  → row opacity changes immediately

Delete:
  DELETE /api/v1/users/:id
  → row fade-out, removed from list
```

---

## Guards Summary

| Layer | Mechanism |
|---|---|
| Sidebar icon | Only renders if `user.roles.includes('super_admin')` |
| Next.js route | `settings/layout.tsx` redirects non-super_admin to `/` |
| API endpoints | `RoleGuard` + `@RequireRole('super_admin')` on write endpoints |
| UI — own row | No action menu shown for the currently logged-in user |
| API — own user | Service rejects role/status changes to self with `403` |

---

## Out of Scope

- Inviting users via email link (password is set directly at creation)
- Custom role creation or permission editing from UI
- Audit log of role changes (infrastructure exists but not surfaced here)
- Password reset by admin (separate feature)
