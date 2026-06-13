'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/utils';
import { LogIn, Clock, ExternalLink } from 'lucide-react';
import type { Reservation, Guest, Room } from '@/types';

export default function PendingReservations() {
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  const pending = reservations
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  async function handleCheckIn(id: string) {
    setLoadingId(id);
    try {
      await api.patch(`/api/v1/reservations/${id}`, { status: 'checked_in' });
      mutate('/api/v1/reservations');
    } finally {
      setLoadingId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-3.5 animate-fade-up delay-100">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={13} className="text-[#fb923c]" />
        <h3 className="text-xs text-muted uppercase tracking-wider">
          Reservas pendientes
          <span className="ml-2 bg-[#d9770622] text-[#fb923c] px-1.5 py-0.5 rounded text-[10px] font-medium">
            {pending.length}
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr>
            {['#', 'Huésped', 'Hab.', 'Check-in', 'Check-out', 'Total', ''].map((h) => (
              <th
                key={h}
                className="text-left text-xs text-muted uppercase tracking-wider pb-2 font-medium whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pending.map((r, i) => {
            const g = guestMap[r.guestId];
            const room = roomMap[r.roomId];
            const isLoading = loadingId === r.id;

            return (
              <tr
                key={r.id}
                className="group border-t border-border"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <Link
                    href={`/reservations/${r.id}`}
                    className="font-mono text-xs text-muted hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {r.confirmationNumber}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-white">
                  {g ? `${g.firstName} ${g.lastName}` : '—'}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-muted whitespace-nowrap">
                  {room?.roomNumber ?? '—'}
                </td>
                <td className="py-2.5 pr-3 text-[#ccc] whitespace-nowrap">{formatDate(r.checkInDate)}</td>
                <td className="py-2.5 pr-3 text-[#ccc] whitespace-nowrap">{formatDate(r.checkOutDate)}</td>
                <td className="py-2.5 pr-3 font-mono text-sm text-white whitespace-nowrap">
                  {formatPrice(Number(r.totalAmount || r.baseAmount))}
                </td>
                <td className="py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => handleCheckIn(r.id)}
                      disabled={isLoading}
                      className="press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#0369a122] text-[#38bdf8] border border-[#0369a133] hover:bg-[#0369a133] disabled:opacity-40 transition-colors"
                    >
                      <LogIn size={11} />
                      {isLoading ? '...' : 'Check In'}
                    </button>
                    <Link
                      href={`/reservations/${r.id}`}
                      className="press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card text-muted border border-border hover:text-white hover:border-[#0f766e44] transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
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
