'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { Room, Reservation, Guest } from '@/types';

const DAYS = 14;

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function RoomCalendar() {
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));

  function getReservation(roomId: string, day: string) {
    return reservations.find(
      (r) =>
        r.roomId === roomId &&
        ['confirmed', 'checked_in', 'pending'].includes(r.status) &&
        day >= r.checkInDate &&
        day < r.checkOutDate
    );
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 700 }}>
        {/* Header row */}
        <div className="flex gap-0.5 mb-1">
          <div className="w-20 flex-shrink-0" />
          {days.map((day) => {
            const d = new Date(day + 'T12:00:00');
            return (
              <div key={day} className="flex-1 text-center">
                <p className="text-[9px] text-muted uppercase">{DAY_LABELS[d.getDay()]}</p>
                <p className="text-xs text-[#ccc] font-mono">{d.getDate()}</p>
              </div>
            );
          })}
        </div>

        {/* Room rows */}
        {rooms.map((room) => (
          <div key={room.id} className="flex gap-0.5 mb-0.5 items-center">
            <div className="w-20 flex-shrink-0 text-xs font-mono text-[#ccc] pr-2 text-right">
              {room.roomNumber}
            </div>
            {days.map((day) => {
              const res = getReservation(room.id, day);
              const isStart = res && day === res.checkInDate;
              const g = res ? guestMap[res.guestId] : null;

              const bgColor =
                res?.status === 'checked_in'
                  ? 'bg-[#0369a140] border-[#0369a160]'
                  : res
                  ? 'bg-[#0f766e40] border-[#0f766e60]'
                  : 'bg-border border-transparent';

              return (
                <div
                  key={day}
                  className={`flex-1 h-7 rounded-sm border text-[8px] text-white flex items-center px-1 overflow-hidden ${bgColor}`}
                  title={res ? `${g?.firstName} ${g?.lastName} — ${res.confirmationNumber}` : ''}
                >
                  {isStart && g && (
                    <span className="truncate">{g.firstName[0]}. {g.lastName}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
