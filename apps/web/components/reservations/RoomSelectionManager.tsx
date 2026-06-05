'use client';

import { Trash2, Plus, Minus, BedDouble } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Room, RoomType } from '@/types';

export interface RoomLine {
  id: string;     // local key for list rendering
  roomId: string; // physical room ID
  adults: number;
  children: number;
}

interface Props {
  rooms: RoomLine[];
  availableRooms: Room[];   // physical rooms for the selected property
  roomTypes: RoomType[];    // for name + price lookup
  nights: number;
  onChange: (rooms: RoomLine[]) => void;
}

const MAX_ROOMS = 5;
const MIN_ROOMS = 1;

function Counter({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="press w-7 h-7 rounded-md bg-bg border border-border flex items-center justify-center text-muted disabled:opacity-30"
        >
          <Minus size={11} />
        </button>
        <span className="w-5 text-center text-sm font-mono text-white select-none">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="press w-7 h-7 rounded-md bg-bg border border-border flex items-center justify-center text-muted disabled:opacity-30"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

export default function RoomSelectionManager({
  rooms, availableRooms, roomTypes, nights, onChange,
}: Props) {
  // IDs already chosen in OTHER lines (to disable them in each dropdown)
  const usedRoomIds = new Set(rooms.map((r) => r.roomId));

  function addRoom() {
    if (rooms.length >= MAX_ROOMS) return;
    // Pick first room not already selected
    const next = availableRooms.find((r) => !usedRoomIds.has(r.id));
    onChange([
      ...rooms,
      { id: `line-${Date.now()}`, roomId: next?.id ?? '', adults: 1, children: 0 },
    ]);
  }

  function removeRoom(id: string) {
    if (rooms.length <= MIN_ROOMS) return;
    onChange(rooms.filter((r) => r.id !== id));
  }

  function updateRoom(id: string, patch: Partial<Omit<RoomLine, 'id'>>) {
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function getRoomType(room: Room): RoomType | undefined {
    return roomTypes.find((t) => t.id === room.roomTypeId);
  }

  function getPricePerNight(roomId: string): number {
    const physical = availableRooms.find((r) => r.id === roomId);
    if (!physical) return 0;
    return Number(getRoomType(physical)?.basePrice ?? 0);
  }

  const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = rooms.reduce((s, r) => s + r.children, 0);
  const grandTotal = rooms.reduce((s, r) => s + getPricePerNight(r.roomId) * nights, 0);

  const noRoomsLeft = availableRooms.length === 0;
  const allRoomsUsed = usedRoomIds.size >= availableRooms.length;

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f766e0a] border border-[#0f766e22] rounded-lg">
        <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
          <span className="text-white font-medium">
            {rooms.length} habitación{rooms.length !== 1 ? 'es' : ''}
          </span>
          <span>·</span>
          <span>
            {totalAdults} adulto{totalAdults !== 1 ? 's' : ''}
            {totalChildren > 0 ? `, ${totalChildren} niño${totalChildren !== 1 ? 's' : ''}` : ''}
          </span>
        </div>
        {nights > 0 && grandTotal > 0 && (
          <span className="text-xs font-mono text-primary-light font-medium">
            {formatPrice(grandTotal)} total
          </span>
        )}
      </div>

      {noRoomsLeft && (
        <p className="text-xs text-[#fb923c] text-center py-2">
          No hay habitaciones para la propiedad seleccionada.
        </p>
      )}

      {/* Room lines */}
      {rooms.map((line, idx) => {
        const physical = availableRooms.find((r) => r.id === line.roomId);
        const rt = physical ? getRoomType(physical) : undefined;
        const pricePerNight = getPricePerNight(line.roomId);
        const roomSubtotal = pricePerNight * nights;

        return (
          <div
            key={line.id}
            className="bg-bg border border-border rounded-xl p-4 animate-fade-up"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#0f766e22] flex items-center justify-center">
                  <BedDouble size={11} className="text-primary" />
                </div>
                <span className="text-xs font-medium text-[#ccc] uppercase tracking-wider">
                  Habitación {idx + 1}
                </span>
                {rt && (
                  <span className="text-[10px] text-primary bg-[#0f766e15] px-2 py-0.5 rounded-full">
                    {rt.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRoom(line.id)}
                disabled={rooms.length <= MIN_ROOMS}
                className="press text-muted nav-hover-danger p-1.5 rounded-lg disabled:opacity-20"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Room selector + counters */}
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-[10px] text-muted uppercase tracking-wider">
                  Habitación
                </label>
                <select
                  value={line.roomId}
                  onChange={(e) => updateRoom(line.id, { roomId: e.target.value })}
                  className="input-field bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white"
                >
                  {!line.roomId && <option value="">Seleccionar...</option>}
                  {availableRooms.map((r) => {
                    const type = getRoomType(r);
                    const isUsedElsewhere = usedRoomIds.has(r.id) && r.id !== line.roomId;
                    return (
                      <option key={r.id} value={r.id} disabled={isUsedElsewhere}>
                        Hab. {r.roomNumber}
                        {type ? ` — ${type.name}` : ''}
                        {r.floor ? ` (Piso ${r.floor})` : ''}
                        {isUsedElsewhere ? ' (ya seleccionada)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <Counter
                label="Adultos"
                value={line.adults}
                min={1}
                max={10}
                onChange={(n) => updateRoom(line.id, { adults: n })}
              />
              <Counter
                label="Niños"
                value={line.children}
                min={0}
                max={10}
                onChange={(n) => updateRoom(line.id, { children: n })}
              />
            </div>

            {/* Price preview */}
            {nights > 0 && pricePerNight > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted">
                  {formatPrice(pricePerNight)}/noche × {nights}
                </span>
                <span className="text-xs font-mono font-medium text-white">
                  {formatPrice(roomSubtotal)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Add room button */}
      <button
        type="button"
        onClick={addRoom}
        disabled={rooms.length >= MAX_ROOMS || allRoomsUsed || noRoomsLeft}
        className="press w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-muted text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ transition: 'border-color 150ms, color 150ms' }}
      >
        <Plus size={14} />
        {allRoomsUsed
          ? 'No hay más habitaciones disponibles'
          : rooms.length >= MAX_ROOMS
          ? `Máximo ${MAX_ROOMS} habitaciones`
          : 'Añadir otra habitación'}
      </button>
    </div>
  );
}
