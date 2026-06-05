'use client';

import { useId } from 'react';
import { Trash2, Plus, Minus, BedDouble } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { RoomType } from '@/types';

export interface RoomLine {
  id: string;
  roomTypeId: string;
  adults: number;
  children: number;
}

interface Props {
  rooms: RoomLine[];
  roomTypes: RoomType[];
  nights: number;
  onChange: (rooms: RoomLine[]) => void;
}

const MAX_ROOMS = 5;
const MIN_ROOMS = 1;

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
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
          aria-label={`Reducir ${label}`}
        >
          <Minus size={11} />
        </button>
        <span className="w-5 text-center text-sm font-mono text-white select-none">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="press w-7 h-7 rounded-md bg-bg border border-border flex items-center justify-center text-muted disabled:opacity-30"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

export default function RoomSelectionManager({ rooms, roomTypes, nights, onChange }: Props) {
  const uid = useId();

  function addRoom() {
    if (rooms.length >= MAX_ROOMS) return;
    const defaultType = roomTypes[0]?.id ?? '';
    onChange([
      ...rooms,
      { id: `${uid}-${Date.now()}`, roomTypeId: defaultType, adults: 1, children: 0 },
    ]);
  }

  function removeRoom(id: string) {
    if (rooms.length <= MIN_ROOMS) return;
    onChange(rooms.filter((r) => r.id !== id));
  }

  function updateRoom(id: string, patch: Partial<Omit<RoomLine, 'id'>>) {
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = rooms.reduce((s, r) => s + r.children, 0);
  const totalGuests = totalAdults + totalChildren;
  const grandTotal = rooms.reduce((s, r) => {
    const rt = roomTypes.find((t) => t.id === r.roomTypeId);
    return s + Number(rt?.basePrice ?? 0) * nights;
  }, 0);

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f766e0a] border border-[#0f766e22] rounded-lg">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="text-white font-medium">
            {rooms.length} habitación{rooms.length !== 1 ? 'es' : ''}
          </span>
          <span>·</span>
          <span>{totalGuests} huésped{totalGuests !== 1 ? 'es' : ''}</span>
          <span className="text-[10px]">
            ({totalAdults} adulto{totalAdults !== 1 ? 's' : ''}
            {totalChildren > 0 ? `, ${totalChildren} niño${totalChildren !== 1 ? 's' : ''}` : ''})
          </span>
        </div>
        {nights > 0 && grandTotal > 0 && (
          <span className="text-xs font-mono text-primary-light font-medium">
            {formatPrice(grandTotal)} total
          </span>
        )}
      </div>

      {/* Room cards */}
      {rooms.map((room, idx) => {
        const rt = roomTypes.find((t) => t.id === room.roomTypeId);
        const pricePerNight = Number(rt?.basePrice ?? 0);
        const roomSubtotal = pricePerNight * nights;

        return (
          <div
            key={room.id}
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
              </div>
              <button
                type="button"
                onClick={() => removeRoom(room.id)}
                disabled={rooms.length <= MIN_ROOMS}
                title="Eliminar habitación"
                className="press text-muted nav-hover-danger p-1.5 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Type selector + counters */}
            <div className="flex items-end gap-4 flex-wrap">
              {/* Room type */}
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-[10px] text-muted uppercase tracking-wider">
                  Tipo de habitación
                </label>
                <select
                  value={room.roomTypeId}
                  onChange={(e) => updateRoom(room.id, { roomTypeId: e.target.value })}
                  className="input-field bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white"
                >
                  {roomTypes.length === 0 && (
                    <option value="">Sin tipos disponibles</option>
                  )}
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adults */}
              <Counter
                label="Adultos"
                value={room.adults}
                min={1}
                max={10}
                onChange={(n) => updateRoom(room.id, { adults: n })}
              />

              {/* Children */}
              <Counter
                label="Niños"
                value={room.children}
                min={0}
                max={10}
                onChange={(n) => updateRoom(room.id, { children: n })}
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
        disabled={rooms.length >= MAX_ROOMS}
        className="press w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-muted text-sm hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ transition: 'border-color 150ms, color 150ms' }}
      >
        <Plus size={14} />
        Añadir otra habitación
        {rooms.length >= MAX_ROOMS && (
          <span className="text-xs ml-1">(máximo {MAX_ROOMS})</span>
        )}
      </button>
    </div>
  );
}
