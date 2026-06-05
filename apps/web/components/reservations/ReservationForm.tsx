'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { calcNights } from '@/lib/utils';
import RoomSelectionManager, { type RoomLine } from './RoomSelectionManager';
import type { Property, Room, RoomType, Guest } from '@/types';

/** Only user-input data — no fetched reference data */
export interface ReservationFormData {
  guest: Guest | null;
  propertyId: string;
  rooms: RoomLine[];
  checkInDate: string;
  checkOutDate: string;
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

  /* ── Reference data (local only, not in parent state) ── */
  const [localRooms, setLocalRooms] = useState<Room[]>([]);
  const [localTypes, setLocalTypes] = useState<RoomType[]>([]);

  const { data: properties = [] } = useSWR<Property[]>('/api/v1/properties', fetcher);
  const { data: fetchedRooms = [] } = useSWR<Room[]>(
    value.propertyId ? `/api/v1/rooms?propertyId=${value.propertyId}` : null,
    fetcher,
  );
  const { data: fetchedTypes = [] } = useSWR<RoomType[]>(
    value.propertyId ? `/api/v1/room-types?propertyId=${value.propertyId}` : '/api/v1/room-types',
    fetcher,
  );
  const { data: guestResults = [] } = useSWR<Guest[]>(
    guestSearch.length >= 2 ? `/api/v1/guests?search=${encodeURIComponent(guestSearch)}` : null,
    fetcher,
  );

  /* ── Sync fetched rooms into local state (never in render phase) ── */
  useEffect(() => {
    if (fetchedRooms.length > 0) setLocalRooms(fetchedRooms);
  }, [fetchedRooms]);

  useEffect(() => {
    if (fetchedTypes.length > 0) setLocalTypes(fetchedTypes);
  }, [fetchedTypes]);

  /* ── Pre-fill first room when rooms arrive ── */
  useEffect(() => {
    if (fetchedRooms.length > 0 && value.rooms[0]?.roomId === '') {
      onChange({
        ...value,
        rooms: [
          { ...value.rooms[0], roomId: fetchedRooms[0].id },
          ...value.rooms.slice(1),
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedRooms]);

  /* ── Reset local data when property changes ── */
  function handlePropertyChange(propertyId: string) {
    setLocalRooms([]);
    setLocalTypes([]);
    onChange({
      ...value,
      propertyId,
      rooms: [{ id: `line-${Date.now()}`, roomId: '', adults: 1, children: 0 }],
    });
  }

  function set<K extends keyof ReservationFormData>(key: K, val: ReservationFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function selectGuest(g: Guest) {
    onChange({ ...value, guest: g });
    setGuestSearch(`${g.firstName} ${g.lastName}`);
    setShowGuestResults(false);
  }

  const nights = value.checkInDate && value.checkOutDate
    ? calcNights(value.checkInDate, value.checkOutDate)
    : 0;

  const hasValidRooms = value.rooms.length > 0 && value.rooms.every((r) => r.roomId);
  const canSubmit = !submitting && !!value.guest && hasValidRooms && nights > 0;

  return (
    <div className="space-y-5">
      {/* Guest search */}
      <div className="relative">
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Huésped</label>
        <input
          value={guestSearch}
          onChange={(e) => { setGuestSearch(e.target.value); setShowGuestResults(true); }}
          onFocus={() => setShowGuestResults(true)}
          onBlur={() => setTimeout(() => setShowGuestResults(false), 150)}
          placeholder="Buscar por nombre..."
          className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
        />
        {showGuestResults && guestResults.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl animate-fade-up">
            {guestResults.map((g) => (
              <button
                key={g.id}
                onMouseDown={() => selectGuest(g)}
                className="press w-full text-left px-3 py-2 text-sm text-white hover:bg-card"
              >
                {g.firstName} {g.lastName}
                {g.email && <span className="text-muted text-xs ml-2">{g.email}</span>}
              </button>
            ))}
          </div>
        )}
        {value.guest && (
          <p className="text-xs text-primary mt-1">
            ✓ {value.guest.firstName} {value.guest.lastName}
          </p>
        )}
      </div>

      {/* Property */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Propiedad</label>
        <select
          value={value.propertyId}
          onChange={(e) => handlePropertyChange(e.target.value)}
          className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
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
            className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-2">Check-out</label>
          <input
            type="date"
            value={value.checkOutDate}
            onChange={(e) => set('checkOutDate', e.target.value)}
            min={value.checkInDate}
            className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
          />
        </div>
      </div>
      {nights > 0 && (
        <p className="text-xs text-primary -mt-3">
          {nights} noche{nights !== 1 ? 's' : ''}
        </p>
      )}

      {/* Room selection */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider block mb-3">Habitaciones</label>

        {!value.propertyId && (
          <p className="text-xs text-muted py-2">Seleccioná una propiedad primero</p>
        )}
        {value.propertyId && localRooms.length === 0 && (
          <p className="text-xs text-muted py-2">Cargando habitaciones...</p>
        )}
        {value.propertyId && localRooms.length > 0 && (
          <RoomSelectionManager
            rooms={value.rooms}
            availableRooms={localRooms}
            roomTypes={localTypes}
            nights={nights}
            onChange={(rooms) => set('rooms', rooms)}
          />
        )}
      </div>

      {/* Invoice toggle */}
      <div className="flex items-center justify-between py-1">
        <label className="text-sm text-[#ccc]">¿Requiere factura?</label>
        <button
          type="button"
          onClick={() => set('requiresInvoice', !value.requiresInvoice)}
          className={`relative w-10 h-5 rounded-full ${value.requiresInvoice ? 'bg-primary' : 'bg-border'}`}
          style={{ transition: 'background-color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
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
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">
          Notas <span className="normal-case text-[10px] text-muted">(opcional)</span>
        </label>
        <textarea
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted resize-none"
          placeholder="Preferencias del huésped, solicitudes especiales..."
        />
      </div>

      {/* Debug hint */}
      {!canSubmit && value.guest && value.propertyId && nights > 0 && (
        <p className="text-xs text-[#fb923c]">
          {!hasValidRooms ? 'Seleccioná una habitación para continuar.' : ''}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="press w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
      >
        {submitting
          ? `Guardando...`
          : `Confirmar ${value.rooms.length > 1 ? `${value.rooms.length} habitaciones` : 'reserva'}`}
      </button>
    </div>
  );
}
