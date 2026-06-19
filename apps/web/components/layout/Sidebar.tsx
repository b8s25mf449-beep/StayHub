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
