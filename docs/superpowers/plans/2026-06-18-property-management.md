# Property Management UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PropertyContext, a sidebar property selector, a `/settings/properties` management page, and wire existing data pages to filter by the active property.

**Architecture:** A new `PropertyContext` wraps the dashboard and holds the active property in state + localStorage. The sidebar gains a compact `PropertySelector` popover. All data pages read `activeProperty.id` from `useProperty()` and pass it as a query param. No API changes needed — the properties CRUD and room/channel `?propertyId` filtering already exist.

**Tech Stack:** Next.js 14 App Router, React context, SWR, axios (`lib/api`), Tailwind, lucide-react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/lib/property-context.tsx` | Create | Context + hook |
| `apps/web/components/layout/PropertySelector.tsx` | Create | Sidebar popover widget |
| `apps/web/components/properties/PropertyModal.tsx` | Create | Create/edit form modal |
| `apps/web/app/(dashboard)/settings/properties/page.tsx` | Create | Property list + management |
| `apps/web/app/(dashboard)/layout.tsx` | Modify | Wrap with PropertyProvider |
| `apps/web/components/layout/Sidebar.tsx` | Modify | Add selector + admin settings |
| `apps/web/components/rooms/RoomGrid.tsx` | Modify | Filter by activeProperty.id |
| `apps/web/components/reservations/ReservationTable.tsx` | Modify | Client-side filter by property |
| `apps/web/components/calendar/PmsCalendar.tsx` | Modify | Filter by activeProperty.id |
| `apps/web/components/channels/ChannelList.tsx` | Modify | Pre-fill propertyId from context |

---

## Task 1: PropertyContext

**Files:**
- Create: `apps/web/lib/property-context.tsx`

- [ ] **Step 1: Create the context file**

```tsx
// apps/web/lib/property-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import api from './api';
import { useAuth } from './auth';
import type { Property } from '@/types';

const PLAN_LIMITS: Record<string, number> = {
  starter: 1,
  professional: 5,
  enterprise: Infinity,
};

interface PropertyContextValue {
  properties: Property[];
  activeProperty: Property | null;
  loading: boolean;
  plan: string;
  canAddProperty: boolean;
  switchProperty: (id: string) => void;
  refetch: () => void;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState('starter');

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    try {
      const [propsRes, tenantRes] = await Promise.all([
        api.get<Property[]>('/api/v1/properties'),
        api.get(`/api/v1/tenants/${user.tenantId}`),
      ]);
      const props = propsRes.data;
      setProperties(props);
      setPlan(tenantRes.data.plan ?? 'starter');

      const savedId = localStorage.getItem('activePropertyId');
      const saved = props.find((p) => p.id === savedId);
      setActiveProperty(saved ?? props[0] ?? null);
    } catch {
      // ignore — user sees empty state
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  function switchProperty(id: string) {
    const prop = properties.find((p) => p.id === id);
    if (!prop) return;
    setActiveProperty(prop);
    localStorage.setItem('activePropertyId', id);
  }

  const maxProperties = PLAN_LIMITS[plan] ?? 1;
  const canAddProperty = properties.length < maxProperties;

  return (
    <PropertyContext.Provider value={{
      properties, activeProperty, loading, plan,
      canAddProperty, switchProperty, refetch: fetchProperties,
    }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used inside PropertyProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify the file saved correctly**

```bash
head -10 apps/web/lib/property-context.tsx
```
Expected output starts with `'use client';`

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/property-context.tsx
git commit -m "feat: add PropertyContext with plan-based limits and localStorage persistence"
```

---

## Task 2: Wrap Dashboard Layout

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add PropertyProvider to the layout**

Replace the full file content:

```tsx
// apps/web/app/(dashboard)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PropertyProvider } from '@/lib/property-context';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PropertyProvider>
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </PropertyProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/layout.tsx"
git commit -m "feat: wrap dashboard with PropertyProvider"
```

---

## Task 3: PropertySelector Component

**Files:**
- Create: `apps/web/components/layout/PropertySelector.tsx`

- [ ] **Step 1: Create the popover selector**

```tsx
// apps/web/components/layout/PropertySelector.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronRight, Plus } from 'lucide-react';
import { useProperty } from '@/lib/property-context';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter · máx. 1',
  professional: 'Pro · máx. 5',
  enterprise: 'Enterprise · ilimitadas',
};

export default function PropertySelector() {
  const { properties, activeProperty, switchProperty, canAddProperty, plan } = useProperty();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = activeProperty
    ? activeProperty.name.slice(0, 2).toUpperCase()
    : '—';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={activeProperty?.name ?? 'Sin propiedad'}
        className={`w-9 h-9 rounded-lg flex items-center justify-center press nav-hover text-xs font-bold
          ${activeProperty ? 'bg-[#0f766e22] text-primary' : 'bg-surface text-muted border border-border'}`}
      >
        {activeProperty ? label : <Building2 size={15} />}
      </button>

      {open && (
        <div className="absolute left-12 top-0 z-50 w-56 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted">Propiedad activa</p>
            <p className="text-xs text-white font-medium truncate mt-0.5">
              {activeProperty?.name ?? 'Ninguna'}
            </p>
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => { switchProperty(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#ffffff08] transition-colors text-left"
              >
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[#0f766e22] text-primary text-[10px] font-bold">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-white">{p.name}</span>
                {activeProperty?.id === p.id && <Check size={12} className="text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border p-1">
            {canAddProperty ? (
              <button
                onClick={() => { router.push('/settings/properties'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-[#0f766e11] rounded-lg transition-colors"
              >
                <Plus size={13} />
                Nueva propiedad
              </button>
            ) : (
              <div className="px-3 py-2">
                <p className="text-xs text-muted">{PLAN_LABELS[plan]}</p>
                <button
                  onClick={() => { router.push('/settings/properties'); setOpen(false); }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  Gestionar propiedades <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/layout/PropertySelector.tsx
git commit -m "feat: add PropertySelector sidebar popover with plan limits"
```

---

## Task 4: Update Sidebar

**Files:**
- Modify: `apps/web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add PropertySelector and fix admin Settings visibility**

Replace the full file:

```tsx
// apps/web/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import PropertySelector from './PropertySelector';
import {
  LayoutDashboard, CalendarDays, Calendar,
  BedDouble, Globe2, Settings, LogOut,
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
  const isAdmin = user?.roles?.some((r) => r === 'admin' || r === 'super_admin') ?? false;
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-1 flex-shrink-0 animate-fade-in">
      <Link
        href="/"
        className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm mb-2 press"
      >
        S
      </Link>

      <PropertySelector />

      <div className="w-6 border-t border-border my-1" />

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
        {isAdmin && (
          <Link
            href="/settings/properties"
            title="Propiedades"
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/layout/Sidebar.tsx
git commit -m "feat: add PropertySelector to sidebar, show Settings for admin role"
```

---

## Task 5: PropertyModal Component

**Files:**
- Create: `apps/web/components/properties/PropertyModal.tsx`

- [ ] **Step 1: Create the modal**

```tsx
// apps/web/components/properties/PropertyModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import type { Property } from '@/types';

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
];

interface Props {
  property?: Property;
  onClose: () => void;
  onSaved: () => void;
}

export default function PropertyModal({ property, onClose, onSaved }: Props) {
  const isEdit = !!property;
  const [form, setForm] = useState({
    name: '', type: 'hotel', address: '', city: '',
    country: '', phone: '', email: '',
    checkInTime: '', checkOutTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name ?? '',
        type: property.type ?? 'hotel',
        address: (property as Record<string, unknown>).address as string ?? '',
        city: property.city ?? '',
        country: property.country ?? '',
        phone: (property as Record<string, unknown>).phone as string ?? '',
        email: (property as Record<string, unknown>).email as string ?? '',
        checkInTime: (property as Record<string, unknown>).checkInTime as string ?? '',
        checkOutTime: (property as Record<string, unknown>).checkOutTime as string ?? '',
      });
    }
  }, [property]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        ...(form.address && { address: form.address }),
        ...(form.city && { city: form.city }),
        ...(form.country && { country: form.country }),
        ...(form.phone && { phone: form.phone }),
        ...(form.email && { email: form.email }),
        ...(form.checkInTime && { checkInTime: form.checkInTime }),
        ...(form.checkOutTime && { checkOutTime: form.checkOutTime }),
      };
      if (isEdit) {
        await api.put(`/api/v1/properties/${property!.id}`, payload);
      } else {
        await api.post('/api/v1/properties', payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted';
  const labelClass = 'text-xs text-muted uppercase tracking-wider block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white press">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Hotel Travertino"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Tipo *</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Check-in</label>
              <input
                type="time"
                className={inputClass}
                value={form.checkInTime}
                onChange={(e) => set('checkInTime', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Check-out</label>
              <input
                type="time"
                className={inputClass}
                value={form.checkOutTime}
                onChange={(e) => set('checkOutTime', e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Contacto y ubicación</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Calle 123" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ciudad" />
                </div>
                <div>
                  <label className={labelClass}>País</label>
                  <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="México" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+52 55 0000 0000" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@hotel.com" />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-[#f87171] text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium press disabled:opacity-50"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear propiedad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/properties/PropertyModal.tsx
git commit -m "feat: add PropertyModal for create/edit"
```

---

## Task 6: Properties Settings Page

**Files:**
- Create: `apps/web/app/(dashboard)/settings/properties/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// apps/web/app/(dashboard)/settings/properties/page.tsx
'use client';

import { useState } from 'react';
import { Building2, Edit2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useProperty } from '@/lib/property-context';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import PropertyModal from '@/components/properties/PropertyModal';
import type { Property } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel', hostel: 'Hostel', boutique: 'Boutique',
  apartment: 'Apartamento', vacation_rental: 'Vacation Rental',
};

const PLAN_LIMITS: Record<string, number> = {
  starter: 1, professional: 5, enterprise: Infinity,
};

export default function PropertiesPage() {
  const { properties, activeProperty, switchProperty, refetch, plan, canAddProperty } = useProperty();
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const isAdmin = user?.roles?.some((r) => r === 'admin' || r === 'super_admin') ?? false;

  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/v1/properties/${id}`);
      if (activeProperty?.id === id) {
        const remaining = properties.filter((p) => p.id !== id);
        if (remaining.length > 0) switchProperty(remaining[0].id);
      }
      refetch();
    } catch {
      alert('Error al eliminar la propiedad');
    } finally {
      setDeletingId(null);
    }
  }

  const maxProperties = PLAN_LIMITS[plan] ?? 1;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <div>
          <h2 className="text-lg font-semibold">Propiedades</h2>
          <p className="text-xs text-muted mt-0.5">
            {properties.length} de {maxProperties === Infinity ? '∞' : maxProperties} propiedades
            · Plan <span className="capitalize">{plan}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingProperty(undefined); setShowModal(true); }}
            disabled={!canAddProperty}
            title={!canAddProperty ? `Tu plan ${plan} no permite más propiedades` : undefined}
            className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Nueva propiedad
          </button>
        )}
      </div>

      {!canAddProperty && (
        <div className="flex items-start gap-3 bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl p-4 mb-6 animate-fade-up delay-50">
          <AlertTriangle size={16} className="text-[#f97316] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#f97316]">
            Has alcanzado el límite de tu plan <span className="capitalize font-medium">{plan}</span>.
            Contacta al administrador para cambiar de plan y añadir más propiedades.
          </p>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center animate-fade-up delay-50">
          <Building2 size={32} className="text-muted mx-auto mb-3" />
          <h3 className="font-medium mb-1">Sin propiedades</h3>
          <p className="text-sm text-muted mb-4">Crea tu primera propiedad para empezar a gestionar habitaciones y reservas.</p>
          {isAdmin && (
            <button
              onClick={() => { setEditingProperty(undefined); setShowModal(true); }}
              className="press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Crear primera propiedad
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up delay-75">
          {properties.map((p) => (
            <div
              key={p.id}
              className={`bg-surface border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                activeProperty?.id === p.id ? 'border-primary/50' : 'border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-[#0f766e22] flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{p.name}</p>
                  {activeProperty?.id === p.id && (
                    <span className="text-[10px] bg-[#0f766e22] text-primary px-2 py-0.5 rounded-full font-medium">
                      Activa
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {TYPE_LABELS[p.type] ?? p.type}
                  {p.city ? ` · ${p.city}` : ''}
                  {p.country ? `, ${p.country}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {activeProperty?.id !== p.id && (
                  <button
                    onClick={() => switchProperty(p.id)}
                    className="text-xs text-primary hover:underline px-2 py-1 press"
                  >
                    Activar
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setEditingProperty(p); setShowModal(true); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-[#ffffff08] press"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => { setDeletingId(p.id); handleDelete(p.id); }}
                    disabled={deletingId === p.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-[#f87171] hover:bg-[#f87171]/10 press disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PropertyModal
          property={editingProperty}
          onClose={() => setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/settings/properties/page.tsx"
git commit -m "feat: add /settings/properties management page"
```

---

## Task 7: Wire RoomGrid to Active Property

**Files:**
- Modify: `apps/web/components/rooms/RoomGrid.tsx`

- [ ] **Step 1: Read current file**

```bash
head -25 apps/web/components/rooms/RoomGrid.tsx
```

- [ ] **Step 2: Add useProperty and filter SWR key**

Find the SWR call `useSWR<Room[]>('/api/v1/rooms', fetcher)` and replace the top of the component:

```tsx
// Add import at top of file (after existing imports):
import { useProperty } from '@/lib/property-context';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

// Inside the component, before the existing useSWR call, add:
const { activeProperty } = useProperty();

// Replace the existing useSWR line:
const { data: rooms = [], mutate } = useSWR<Room[]>(
  activeProperty ? `/api/v1/rooms?propertyId=${activeProperty.id}` : null,
  fetcher,
);

// Also update mutate calls from:
//   mutate('/api/v1/rooms')
// to:
//   mutate(`/api/v1/rooms?propertyId=${activeProperty?.id}`)
```

- [ ] **Step 3: Add empty state when no property**

Find the return statement and add before the existing JSX:

```tsx
if (!activeProperty) {
  return (
    <div className="text-center py-12">
      <Building2 size={28} className="text-muted mx-auto mb-3" />
      <p className="text-sm text-muted mb-3">Selecciona una propiedad para ver sus habitaciones</p>
      <Link href="/settings/properties" className="text-sm text-primary hover:underline">
        Gestionar propiedades →
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/rooms/RoomGrid.tsx
git commit -m "feat: filter RoomGrid by active property"
```

---

## Task 8: Wire ReservationTable to Active Property

**Files:**
- Modify: `apps/web/components/reservations/ReservationTable.tsx`

- [ ] **Step 1: Add useProperty and client-side filter**

The reservations API doesn't support `?propertyId` filtering. Filter client-side by keeping only reservations whose `roomId` is in the active property's room list.

Find the SWR declarations at the top of the component and update:

```tsx
// Add import at top:
import { useProperty } from '@/lib/property-context';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

// Inside component, add:
const { activeProperty } = useProperty();

// Replace existing SWR calls:
const { data: allReservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
const { data: rooms = [] } = useSWR<Room[]>(
  activeProperty ? `/api/v1/rooms?propertyId=${activeProperty.id}` : null,
  fetcher,
);

// After the SWR calls, add:
const propertyRoomIds = new Set(rooms.map((r) => r.id));
const reservations = activeProperty
  ? allReservations.filter((r) => propertyRoomIds.has(r.roomId))
  : allReservations;
```

- [ ] **Step 2: Add empty state when no property**

In the component return, before the table JSX:

```tsx
if (!activeProperty) {
  return (
    <div className="text-center py-12">
      <Building2 size={28} className="text-muted mx-auto mb-3" />
      <p className="text-sm text-muted mb-3">Selecciona una propiedad para ver sus reservas</p>
      <Link href="/settings/properties" className="text-sm text-primary hover:underline">
        Gestionar propiedades →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/reservations/ReservationTable.tsx
git commit -m "feat: filter ReservationTable by active property (client-side)"
```

---

## Task 9: Wire PmsCalendar to Active Property

**Files:**
- Modify: `apps/web/components/calendar/PmsCalendar.tsx`

- [ ] **Step 1: Add useProperty and filter by propertyId**

```tsx
// Add import at top:
import { useProperty } from '@/lib/property-context';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

// Inside component, add near top:
const { activeProperty } = useProperty();

// Replace existing SWR calls (around line 92-94):
const { data: rooms = [] } = useSWR<Room[]>(
  activeProperty ? `/api/v1/rooms?propertyId=${activeProperty.id}` : null,
  fetcher,
);
const { data: reservations = [], mutate: swrMutate } = useSWR<Reservation[]>(
  '/api/v1/reservations',
  fetcher,
);

// After SWR calls, add client-side filter for reservations:
const propertyRoomIds = new Set(rooms.map((r) => r.id));
const filteredReservations = activeProperty
  ? reservations.filter((r) => propertyRoomIds.has(r.roomId))
  : reservations;
```

- [ ] **Step 2: Replace `reservations` with `filteredReservations` in calendar logic**

Search for all uses of `reservations` in the calendar render logic (building blocks, overlap detection, etc.) and replace with `filteredReservations`.

- [ ] **Step 3: Add early return for no property**

Before the calendar return:

```tsx
if (!activeProperty) {
  return (
    <div className="text-center py-16">
      <Building2 size={28} className="text-muted mx-auto mb-3" />
      <p className="text-sm text-muted mb-3">Selecciona una propiedad para ver el calendario</p>
      <Link href="/settings/properties" className="text-sm text-primary hover:underline">
        Gestionar propiedades →
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/PmsCalendar.tsx
git commit -m "feat: filter PmsCalendar by active property"
```

---

## Task 10: Wire ChannelList to Active Property

**Files:**
- Modify: `apps/web/components/channels/ChannelList.tsx`

- [ ] **Step 1: Pre-fill propertyId from context**

```tsx
// Add import at top:
import { useProperty } from '@/lib/property-context';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

// Inside component, add:
const { activeProperty } = useProperty();

// Update the form initial state to pre-fill propertyId:
const [form, setForm] = useState({
  propertyId: activeProperty?.id ?? '',
  roomId: '', channel: 'booking_com', icalUrl: '',
});

// Add useEffect to sync when activeProperty changes:
useEffect(() => {
  setForm((f) => ({ ...f, propertyId: activeProperty?.id ?? '', roomId: '' }));
}, [activeProperty?.id]);

// Replace rooms SWR to filter by property:
const { data: rooms = [] } = useSWR<Room[]>(
  activeProperty ? `/api/v1/rooms?propertyId=${activeProperty.id}` : null,
  fetcher,
);
```

- [ ] **Step 2: Add empty state when no property**

```tsx
if (!activeProperty) {
  return (
    <div className="text-center py-12">
      <Building2 size={28} className="text-muted mx-auto mb-3" />
      <p className="text-sm text-muted mb-3">Selecciona una propiedad para gestionar sus canales</p>
      <Link href="/settings/properties" className="text-sm text-primary hover:underline">
        Gestionar propiedades →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/channels/ChannelList.tsx
git commit -m "feat: pre-fill ChannelList propertyId from active property"
```

---

## Task 11: Build & Deploy

- [ ] **Step 1: Run build to catch TypeScript errors**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no type errors. Fix any errors before proceeding.

- [ ] **Step 2: Deploy web**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd apps/web
vercel deploy --prod --yes 2>&1 | grep -E "Production|Aliased|error"
```

Expected: `▲ Aliased https://stayhub-web-theta.vercel.app`

- [ ] **Step 3: Smoke test**

1. Open https://stayhub-web-theta.vercel.app/login
2. Login with `admin@travertino.com`
3. Sidebar shows property selector button below "S" logo
4. Click it — popover shows existing property or "+ Nueva propiedad"
5. Navigate to Settings (gear icon) → `/settings/properties`
6. Create a property, verify it appears in the sidebar selector
7. Navigate to /rooms — should show rooms filtered by active property

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: deploy property management UI"
```
