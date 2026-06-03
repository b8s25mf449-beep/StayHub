'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { ROOM_STATUS_COLORS, ROOM_STATUS_LABELS } from '@/lib/utils';
import type { Room, RoomType } from '@/types';

const STATUS_OPTIONS: Room['status'][] = ['available', 'occupied', 'cleaning', 'maintenance'];

export default function RoomGrid() {
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: roomTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);
  const [updating, setUpdating] = useState<string | null>(null);

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
    <div>
      {/* Legend */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${ROOM_STATUS_COLORS[s].split(' ')[0]}`} />
            <span className="text-xs text-muted">{ROOM_STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-8 gap-2">
        {rooms.map((room) => {
          const rt = typeMap[room.roomTypeId];
          return (
            <div
              key={room.id}
              className={`relative rounded-lg p-2.5 text-center cursor-pointer group transition-transform hover:scale-105 ${ROOM_STATUS_COLORS[room.status]}`}
            >
              <p className="text-sm font-bold font-mono">{room.roomNumber}</p>
              <p className="text-[9px] mt-0.5 opacity-70 truncate">{rt?.name ?? ''}</p>

              {/* Status change dropdown on hover */}
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg py-1 hidden group-hover:block shadow-xl">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); updateStatus(room, s); }}
                    disabled={room.status === s || updating === room.id}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#ccc] hover:bg-card disabled:opacity-40 transition-colors"
                  >
                    {ROOM_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
