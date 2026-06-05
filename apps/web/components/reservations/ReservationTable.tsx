'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { formatDate, formatPrice, STATUS_LABELS, STATUS_COLORS, todayISO } from '@/lib/utils';
import type { Reservation, Guest, Room } from '@/types';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'checkin_today', label: 'Check-in hoy' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'cancelled', label: 'Canceladas' },
];

export default function ReservationTable() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const today = todayISO();

  const filtered = reservations.filter((r) => {
    const g = guestMap[r.guestId];
    const guestName = g ? `${g.firstName} ${g.lastName}`.toLowerCase() : '';
    const matchSearch =
      !search ||
      guestName.includes(search.toLowerCase()) ||
      r.confirmationNumber.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === 'all' ||
      (filter === 'confirmed' && r.status === 'confirmed') ||
      (filter === 'checkin_today' && r.checkInDate === today && r.status === 'confirmed') ||
      (filter === 'pending' && r.status === 'pending') ||
      (filter === 'cancelled' && r.status === 'cancelled');

    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap animate-fade-up delay-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`press px-3 py-1.5 rounded-md text-xs font-medium border ${
              filter === f.key
                ? 'bg-[#0f766e22] text-primary border-[#0f766e44]'
                : 'bg-surface text-muted border-border hover:text-[#ccc]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar huésped o #..."
          className="input-field ml-auto bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-[#ccc] placeholder-muted w-48"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface">
              {['Confirmación', 'Huésped', 'Habitación', 'Check-in', 'Check-out', 'Estado', 'Total'].map((h) => (
                <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-8 text-sm">
                  No hay reservas
                </td>
              </tr>
            )}
            {filtered.map((r, i) => {
              const g = guestMap[r.guestId];
              const room = roomMap[r.roomId];
              return (
                <tr
                  key={r.id}
                  className="border-t border-border animate-fade-up"
                  style={{
                    animationDelay: `${50 + i * 30}ms`,
                    transition: 'background-color 150ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f1520')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted">{r.confirmationNumber}</td>
                  <td className="px-4 py-3 text-white text-sm">
                    {g ? `${g.firstName} ${g.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{room?.roomNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-[#ccc] text-sm">{formatDate(r.checkInDate)}</td>
                  <td className="px-4 py-3 text-[#ccc] text-sm">{formatDate(r.checkOutDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white">
                    {formatPrice(Number(r.baseAmount))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
