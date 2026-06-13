'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { LogIn, LogOut, ArrowRight } from 'lucide-react';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { formatPrice, todayISO } from '@/lib/utils';
import type { Reservation, Guest, Room } from '@/types';

interface Group {
  label: string;
  accent: string;
  badgeClass: string;
  icon: React.ReactNode;
  rows: Reservation[];
  action?: { label: string; icon: React.ReactNode; status: string; accentBtn: string };
}

export default function TodayActivity() {
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const roomMap  = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const today    = todayISO();

  const arrivals   = reservations.filter(
    (r) => r.checkInDate === today && ['pending', 'confirmed'].includes(r.status),
  ).sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  const inHouse    = reservations.filter(
    (r) => r.status === 'checked_in' && r.checkOutDate > today,
  ).sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate));

  const departures = reservations.filter(
    (r) => r.status === 'checked_in' && r.checkOutDate === today,
  ).sort((a, b) => a.confirmationNumber.localeCompare(b.confirmationNumber));

  const groups: Group[] = [
    {
      label: 'Llegadas hoy',
      accent: 'text-[#38bdf8]',
      badgeClass: 'bg-[#0369a122] text-[#38bdf8]',
      icon: <LogIn size={12} />,
      rows: arrivals,
      action: {
        label: 'Check In',
        icon: <LogIn size={11} />,
        status: 'checked_in',
        accentBtn: 'bg-[#0369a122] text-[#38bdf8] border-[#0369a133] hover:bg-[#0369a133]',
      },
    },
    {
      label: 'En casa',
      accent: 'text-primary',
      badgeClass: 'bg-[#0f766e22] text-primary',
      icon: <ArrowRight size={12} />,
      rows: inHouse,
    },
    {
      label: 'Salidas hoy',
      accent: 'text-[#fb923c]',
      badgeClass: 'bg-[#d9770622] text-[#fb923c]',
      icon: <LogOut size={12} />,
      rows: departures,
      action: {
        label: 'Check Out',
        icon: <LogOut size={11} />,
        status: 'checked_out',
        accentBtn: 'bg-[#d9770622] text-[#fb923c] border-[#d9770633] hover:bg-[#d9770633]',
      },
    },
  ];

  const total = arrivals.length + inHouse.length + departures.length;
  if (total === 0) return null;

  async function handleAction(id: string, status: string) {
    setLoadingId(id);
    try {
      await api.patch(`/api/v1/reservations/${id}`, { status });
      mutate('/api/v1/reservations');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-3.5 animate-fade-up delay-100">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs text-muted uppercase tracking-wider">Actividad de hoy</h3>
        <span className="bg-[#0f766e22] text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
          {today}
        </span>
      </div>

      <div className="space-y-5">
        {groups.map((group) => {
          if (group.rows.length === 0) return null;
          return (
            <div key={group.label}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={group.accent}>{group.icon}</span>
                <span className="text-xs font-medium text-[#ccc]">{group.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${group.badgeClass}`}>
                  {group.rows.length}
                </span>
              </div>

              {/* Rows */}
              <table className="w-full text-sm">
                <tbody>
                  {group.rows.map((r) => {
                    const g    = guestMap[r.guestId];
                    const room = roomMap[r.roomId];
                    const isLoading = loadingId === r.id;

                    return (
                      <tr key={r.id} className="group border-t border-border">
                        <td className="py-2 pr-3">
                          <Link
                            href={`/reservations/${r.id}`}
                            className="font-mono text-xs text-muted hover:text-primary transition-colors"
                          >
                            {r.confirmationNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-white font-medium">
                          {g ? `${g.firstName} ${g.lastName}` : '—'}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted">
                          Hab. {room?.roomNumber ?? '—'}
                        </td>
                        <td className="py-2 pr-3 font-mono text-sm text-white">
                          {formatPrice(Number(r.totalAmount || r.baseAmount))}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5 justify-end">
                            {group.action && (
                              <button
                                onClick={() => handleAction(r.id, group.action!.status)}
                                disabled={isLoading}
                                className={`press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 transition-colors ${group.action.accentBtn}`}
                              >
                                {group.action.icon}
                                {isLoading ? '...' : group.action.label}
                              </button>
                            )}
                            <Link
                              href={`/reservations/${r.id}`}
                              className="press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card text-muted border border-border hover:text-white hover:border-[#0f766e44] transition-colors"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
