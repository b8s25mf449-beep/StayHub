'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { calcNights } from '@/lib/utils';
import type { Property, Room, RoomType, Guest } from '@/types';

export interface ReservationFormData {
  guest: Guest | null;
  propertyId: string;
  room: Room | null;
  roomType: RoomType | null;
  checkInDate: string;
  checkOutDate: string;
  adultsCount: number;
  childrenCount: number;
  requiresInvoice: boolean;
  notes: string;
}

interface Props {
  value: ReservationFormData;
  onChange: (data: ReservationFormData) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}

export default function ReservationForm({ value, onChange, onSubmit, submitting }: Props) {
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestResults, setShowGuestResults] = useState(false);

  const { data: properties = [] } = useSWR<Property[]>('/api/v1/properties', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>(
    value.propertyId ? `/api/v1/rooms?propertyId=${value.propertyId}` : null,
    fetcher
  );
  const { data: roomTypes = [] } = useSWR<RoomType[]>(
    value.propertyId ? `/api/v1/room-types?propertyId=${value.propertyId}` : null,
    fetcher
  );
  const { data: guestResults = [] } = useSWR<Guest[]>(
    guestSearch.length >= 2 ? `/api/v1/guests?search=${encodeURIComponent(guestSearch)}` : null,
    fetcher
  );

  function set<K extends keyof ReservationFormData>(key: K, val: ReservationFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function selectRoom(roomId: string) {
    const room = rooms.find((r) => r.id === roomId) ?? null;
    const rt = room ? roomTypes.find((t) => t.id === room.roomTypeId) ?? null : null;
    onChange({ ...value, room, roomType: rt });
  }

  function selectGuest(g: Guest) {
    onChange({ ...value, guest: g });
    setGuestSearch(`${g.firstName} ${g.lastName}`);
    setShowGuestResults(false);
  }

  const nights = value.checkInDate && value.checkOutDate
    ? calcNights(value.checkInDate, value.checkOutDate)
    : 0;

  return (
    <div className="space-y-5">
      {/* Guest search */}
      <div className="relative">
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Huésped</label>
        <input
          value={guestSearch}
          onChange={(e) => { setGuestSearch(e.target.value); setShowGuestResults(true); }}
          onFocus={() => setShowGuestResults(true)}
          placeholder="Buscar por nombre..."
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-primary"
        />
        {showGuestResults && guestResults.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded-lg mt-1 max-h-40 overflow-y-auto">
            {guestResults.map((g) => (
              <button
                key={g.id}
                onMouseDown={() => selectGuest(g)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-card transition-colors"
              >
                {g.firstName} {g.lastName}
                {g.email && <span className="text-muted text-xs ml-2">{g.email}</span>}
              </button>
            ))}
          </div>
        )}
        {value.guest && (
          <p className="text-xs text-primary mt-1">✓ {value.guest.firstName} {value.guest.lastName}</p>
        )}
      </div>

      {/* Property */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Propiedad</label>
        <select
          value={value.propertyId}
          onChange={(e) => onChange({ ...value, propertyId: e.target.value, room: null, roomType: null })}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
        >
          <option value="">Seleccionar propiedad...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-2">Check-in</label>
          <input
            type="date"
            value={value.checkInDate}
            onChange={(e) => set('checkInDate', e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-2">Check-out</label>
          <input
            type="date"
            value={value.checkOutDate}
            onChange={(e) => set('checkOutDate', e.target.value)}
            min={value.checkInDate}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
          />
        </div>
      </div>
      {nights > 0 && (
        <p className="text-xs text-primary -mt-3">{nights} noche{nights !== 1 ? 's' : ''}</p>
      )}

      {/* Room */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Habitación</label>
        <select
          value={value.room?.id ?? ''}
          onChange={(e) => selectRoom(e.target.value)}
          disabled={!value.propertyId}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-40"
        >
          <option value="">Seleccionar habitación...</option>
          {rooms.map((r) => {
            const rt = roomTypes.find((t) => t.id === r.roomTypeId);
            return (
              <option key={r.id} value={r.id}>
                {r.roomNumber} — {rt?.name ?? 'Sin tipo'} (${rt?.basePrice ?? 0}/noche)
              </option>
            );
          })}
        </select>
      </div>

      {/* Adults + Children */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-2">Adultos</label>
          <input
            type="number"
            min={1}
            max={10}
            value={value.adultsCount}
            onChange={(e) => set('adultsCount', Number(e.target.value))}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-2">Niños</label>
          <input
            type="number"
            min={0}
            max={10}
            value={value.childrenCount}
            onChange={(e) => set('childrenCount', Number(e.target.value))}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Invoice toggle */}
      <div className="flex items-center justify-between py-1">
        <label className="text-sm text-[#ccc]">¿Requiere factura?</label>
        <button
          type="button"
          onClick={() => set('requiresInvoice', !value.requiresInvoice)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            value.requiresInvoice ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              value.requiresInvoice ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Notas (opcional)</label>
        <textarea
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-primary resize-none"
          placeholder="Preferencias del huésped, solicitudes especiales..."
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || !value.guest || !value.room || !value.checkInDate || !value.checkOutDate || nights === 0}
        className="w-full bg-primary hover:bg-[#0d6962] text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
      >
        {submitting ? 'Guardando...' : 'Confirmar reserva'}
      </button>
    </div>
  );
}
