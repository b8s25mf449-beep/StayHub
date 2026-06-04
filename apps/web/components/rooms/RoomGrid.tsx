'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { ROOM_STATUS_COLORS, ROOM_STATUS_LABELS } from '@/lib/utils';
import type { Room, RoomType } from '@/types';
import RatesDrawer from './RatesDrawer';

const STATUS_OPTIONS: Room['status'][] = ['available', 'occupied', 'cleaning', 'maintenance'];

export default function RoomGrid() {
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: roomTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);
  const [updating, setUpdating] = useState<string | null>(null);
  const [ratesRoom, setRatesRoom] = useState<Room | null>(null);

  const typeMap = Object.fromEntries(roomTypes.map((t) => [t.id, t]));

  async function updateStatus(room: Room, status: Room['status']) {
    setUpdating(room.id);
    try {
      await api.put(`/api/v1/rooms/${room.id}`, { status });
      mutate('/api/v1/rooms');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      <div className="flex gap-3 mb-5 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${ROOM_STATUS_COLORS[s].split(' ')[0]}`} />
            <span className="text-xs text-muted">{ROOM_STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8 gap-2">
        {rooms.map((room, i) => {
          const rt = typeMap[room.roomTypeId];
          return (
            <div
              key={room.id}
              className={`room-card relative rounded-lg p-2.5 text-center cursor-pointer group animate-fade-up ${ROOM_STATUS_COLORS[room.status]}`}
              style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
            >
              <p className="text-sm font-bold font-mono">{room.roomNumber}</p>
              <p className="text-[9px] mt-0.5 opacity-70 truncate">{rt?.name ?? ''}</p>

              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg py-1 hidden group-hover:block shadow-xl min-w-[120px]">
                <div className="px-3 py-1 border-b border-border mb-1">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Estado</p>
                </div>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); updateStatus(room, s); }}
                    disabled={room.status === s || updating === room.id}
                    className="press w-full text-left px-3 py-1.5 text-xs text-[#ccc] hover:bg-card disabled:opacity-40"
                  >
                    {ROOM_STATUS_LABELS[s]}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRatesRoom(room); }}
                    className="press w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-card"
                  >
                    Gestionar tarifas
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ratesRoom && (
        <RatesDrawer
          room={ratesRoom}
          roomType={typeMap[ratesRoom.roomTypeId]}
          onClose={() => setRatesRoom(null)}
        />
      )}
    </>
  );
}
