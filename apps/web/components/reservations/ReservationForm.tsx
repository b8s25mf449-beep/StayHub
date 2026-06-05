'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { calcNights } from '@/lib/utils';
import RoomSelectionManager, { type RoomLine } from './RoomSelectionManager';
import type { Property, Room, RoomType, Guest } from '@/types';

export interface PendingGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Only user-input data — no fetched reference data */
export interface ReservationFormData {
  guest: Guest | null;
  pendingGuest: PendingGuest | null;
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

  /* Refs to latest value/onChange — prevents stale closures in effects */
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => { valueRef.current = value; });
  useEffect(() => { onChangeRef.current = onChange; });

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
    !value.pendingGuest && guestSearch.length >= 2
      ? `/api/v1/guests?search=${encodeURIComponent(guestSearch)}`
      : null,
    fetcher,
  );

  /* ── Sync rooms + types + pre-fill in a single reliable effect ── */
  useEffect(() => {
    if (fetchedTypes.length > 0) setLocalTypes(fetchedTypes);
  }, [fetchedTypes]);

  useEffect(() => {
    if (fetchedRooms.length === 0) return;
    setLocalRooms(fetchedRooms);
    if (valueRef.current.rooms[0]?.roomId === '') {
      onChangeRef.current({
        ...valueRef.current,
        rooms: [
          { ...valueRef.current.rooms[0], roomId: fetchedRooms[0].id },
          ...valueRef.current.rooms.slice(1),
        ],
      });
    }
  }, [fetchedRooms]);

  /* ── Reset local data when property changes ── */
  function handlePropertyChange(propertyId: string) {
    setLocalRooms([]);
    setLocalTypes([]);
    onChange({ ...value, propertyId, rooms: [{ id: `line-${Date.now()}`, roomId: '', adults: 1, children: 0 }] });
    if (fetchedRooms.length > 0) {
      setTimeout(() => {
        if (valueRef.current.rooms[0]?.roomId === '') {
          onChangeRef.current({
            ...valueRef.current,
            rooms: [
              { ...valueRef.current.rooms[0], roomId: fetchedRooms[0].id },
              ...valueRef.current.rooms.slice(1),
            ],
          });
        }
      }, 0);
    }
  }

  function set<K extends keyof ReservationFormData>(key: K, val: ReservationFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function selectGuest(g: Guest) {
    onChange({ ...value, guest: g, pendingGuest: null });
    setGuestSearch(`${g.firstName} ${g.lastName}`);
    setShowGuestResults(false);
  }

  function startNewGuest() {
    const parts = guestSearch.trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    onChange({ ...value, guest: null, pendingGuest: { firstName, lastName, email: '', phone: '' } });
    setShowGuestResults(false);
  }

  function cancelNewGuest() {
    onChange({ ...value, pendingGuest: null });
    setGuestSearch('');
  }

  function setPendingField(field: keyof PendingGuest, val: string) {
    if (!value.pendingGuest) return;
    set('pendingGuest', { ...value.pendingGuest, [field]: val });
  }

  const nights = value.checkInDate && value.checkOutDate
    ? calcNights(value.checkInDate, value.checkOutDate)
    : 0;

  const hasValidRooms = value.rooms.length > 0 && value.rooms.every((r) => r.roomId);
  const pendingGuestValid = !!value.pendingGuest?.firstName.trim() && !!value.pendingGuest?.lastName.trim();
  const hasGuest = !!value.guest || pendingGuestValid;
  const canSubmit = !submitting && hasGuest && hasValidRooms && nights > 0;

  const showCreateOption = showGuestResults && guestSearch.length >= 2;

  return (
    <div className="space-y-5">
      {/* Guest section */}
      <div className="relative">
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Huésped</label>

        {value.pendingGuest ? (
          /* ── Inline new-guest form ── */
          <div className="bg-bg border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary">+ Nuevo huésped</span>
              <button
                type="button"
                onClick={cancelNewGuest}
                className="text-xs text-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">
                  Nombre <span className="text-[#f87171]">*</span>
                </label>
                <input
                  value={value.pendingGuest.firstName}
                  onChange={(e) => setPendingField('firstName', e.target.value)}
                  placeholder="Nombre"
                  autoFocus
                  className="input-field w-full bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-white placeholder-muted"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">
                  Apellido <span className="text-[#f87171]">*</span>
                </label>
                <input
                  value={value.pendingGuest.lastName}
                  onChange={(e) => setPendingField('lastName', e.target.value)}
                  placeholder="Apellido"
                  className="input-field w-full bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-white placeholder-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  value={value.pendingGuest.email}
                  onChange={(e) => setPendingField('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="input-field w-full bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-white placeholder-muted"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={value.pendingGuest.phone}
                  onChange={(e) => setPendingField('phone', e.target.value)}
                  placeholder="+54 9 11 ..."
                  className="input-field w-full bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-white placeholder-muted"
                />
              </div>
            </div>

            {pendingGuestValid && (
              <p className="text-xs text-primary">
                ✓ {value.pendingGuest.firstName} {value.pendingGuest.lastName} — se creará al confirmar
              </p>
            )}
          </div>
        ) : (
          /* ── Search existing guests ── */
          <>
            <input
              value={guestSearch}
              onChange={(e) => { setGuestSearch(e.target.value); setShowGuestResults(true); }}
              onFocus={() => setShowGuestResults(true)}
              onBlur={() => setTimeout(() => setShowGuestResults(false), 150)}
              placeholder="Buscar por nombre..."
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
            />

            {showCreateOption && (
              <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded-lg mt-1 shadow-xl animate-fade-up overflow-hidden">
                {guestResults.length > 0 && (
                  <>
                    <div className="max-h-36 overflow-y-auto">
                      {guestResults.map((g) => (
                        <button
                          key={g.id}
                          onMouseDown={() => selectGuest(g)}
                          className="press w-full text-left px-3 py-2 text-sm text-white hover:bg-card flex items-center justify-between"
                        >
                          <span>{g.firstName} {g.lastName}</span>
                          {g.email && <span className="text-muted text-xs">{g.email}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border" />
                  </>
                )}
                <button
                  onMouseDown={startNewGuest}
                  className="press w-full text-left px-3 py-2 text-sm text-primary hover:bg-card flex items-center gap-2"
                >
                  <span className="font-medium">+</span>
                  <span>
                    Crear &ldquo;{guestSearch.trim()}&rdquo;
                  </span>
                </button>
              </div>
            )}

            {value.guest && (
              <p className="text-xs text-primary mt-1">
                ✓ {value.guest.firstName} {value.guest.lastName}
              </p>
            )}
          </>
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
          role="switch"
          aria-checked={value.requiresInvoice}
          onClick={() => set('requiresInvoice', !value.requiresInvoice)}
          className="relative w-10 h-5 rounded-full"
          style={{
            backgroundColor: value.requiresInvoice ? '#0f766e' : '#1a2535',
            transition: 'background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <span
            className="absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow"
            style={{
              transform: value.requiresInvoice ? 'translateX(21px)' : 'translateX(2px)',
              transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
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

      {!canSubmit && (value.propertyId || value.checkInDate || value.rooms[0]?.roomId) && (
        <p className="text-xs text-[#fb923c]">
          {!value.guest && !value.pendingGuest
            ? 'Buscá y seleccioná un huésped, o creá uno nuevo.'
            : value.pendingGuest && !pendingGuestValid
            ? 'Completá nombre y apellido del nuevo huésped.'
            : !hasValidRooms
            ? 'Seleccioná una habitación para continuar.'
            : nights === 0
            ? 'Las fechas de check-in y check-out no son válidas.'
            : ''}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="press w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
      >
        {submitting
          ? 'Guardando...'
          : `Confirmar ${value.rooms.length > 1 ? `${value.rooms.length} habitaciones` : 'reserva'}`}
      </button>
    </div>
  );
}
