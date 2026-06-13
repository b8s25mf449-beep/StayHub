'use client';

import { useState } from 'react';
import RoomGrid from '@/components/rooms/RoomGrid';
import NewRoomModal from '@/components/rooms/NewRoomModal';
import { Plus } from 'lucide-react';

export default function RoomsPage() {
  const [showNewRoom, setShowNewRoom] = useState(false);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold shrink-0">Habitaciones</h2>
        <button
          onClick={() => setShowNewRoom(true)}
          className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Nueva habitación</span>
          <span className="sm:hidden">Nueva</span>
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
