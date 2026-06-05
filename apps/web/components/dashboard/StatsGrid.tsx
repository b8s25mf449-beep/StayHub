'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { formatPrice, todayISO } from '@/lib/utils';
import type { Room, Reservation } from '@/types';

export default function StatsGrid() {
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);

  const today = todayISO();
  const currentMonth = today.slice(0, 7);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyPct = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const checkInsToday = reservations.filter(
    (r) => r.checkInDate === today && r.status === 'confirmed'
  ).length;

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  const monthlyRevenue = reservations
    .filter(
      (r) =>
        r.checkInDate.startsWith(currentMonth) &&
        ['confirmed', 'checked_in', 'checked_out'].includes(r.status)
    )
    .reduce((sum, r) => sum + Number(r.baseAmount), 0);

  const stats = [
    {
      label: 'Ocupación hoy',
      value: `${occupancyPct}%`,
      sub: `${occupiedRooms} de ${totalRooms} habitaciones`,
      highlight: true,
    },
    {
      label: 'Ingresos del mes',
      value: formatPrice(monthlyRevenue),
      sub: currentMonth,
    },
    {
      label: 'Check-ins hoy',
      value: String(checkInsToday),
      sub: today,
    },
    {
      label: 'Reservas pendientes',
      value: String(pendingCount),
      sub: 'Requieren confirmación',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3.5 mb-6">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`rounded-xl p-4 border animate-fade-up ${
            s.highlight
              ? 'bg-[#0f766e08] border-[#0f766e44]'
              : 'bg-card border-border'
          }`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="text-xs text-muted uppercase tracking-wider mb-2">{s.label}</p>
          <p className={`text-2xl font-bold font-mono ${s.highlight ? 'text-primary-light' : 'text-white'}`}>
            {s.value}
          </p>
          <p className="text-xs text-muted mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
