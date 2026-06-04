'use client';

import { useState } from 'react';
import RoomGrid from '@/components/rooms/RoomGrid';
import NewRoomModal from '@/components/rooms/NewRoomModal';
import { Plus } from 'lucide-react';

export default function RoomsPage() {
  const [showNewRoom, setShowNewRoom] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold">Habitaciones</h2>
        <button
          onClick={() => setShowNewRoom(true)}
          className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={14} />
          Nueva habitación
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 animate-fade-up delay-50">
        <p className="text-xs text-muted uppercase tracking-wider mb-4">
          Hover en una habitación para cambiar estado o gestionar tarifas
        </p>
        <RoomGrid />
      </div>

      {showNewRoom && <NewRoomModal onClose={() => setShowNewRoom(false)} />}
    </div>
  );
}
