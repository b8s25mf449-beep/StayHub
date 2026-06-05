'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { formatDate, formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { Reservation, Guest, Room } from '@/types';

export default function RecentReservations() {
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  const recent = [...reservations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-fade-up delay-150">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Últimas reservas</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['#', 'Huésped', 'Hab.', 'Check-in', 'Estado', 'Total'].map((h) => (
              <th key={h} className="text-left text-xs text-muted uppercase tracking-wider pb-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recent.map((r, i) => {
            const g = guestMap[r.guestId];
            const room = roomMap[r.roomId];
            return (
              <tr
                key={r.id}
                className="border-t border-border animate-fade-up"
                style={{
                  animationDelay: `${200 + i * 40}ms`,
                  transition: 'background-color 150ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f1520')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <td className="py-2.5 pr-3 font-mono text-xs text-muted">{r.confirmationNumber}</td>
                <td className="py-2.5 pr-3 text-white">
                  {g ? `${g.firstName} ${g.lastName}` : '—'}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-muted">{room?.roomNumber ?? '—'}</td>
                <td className="py-2.5 pr-3 text-[#ccc]">{formatDate(r.checkInDate)}</td>
                <td className="py-2.5 pr-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="py-2.5 font-mono text-sm text-white">
                  {formatPrice(Number(r.baseAmount))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
