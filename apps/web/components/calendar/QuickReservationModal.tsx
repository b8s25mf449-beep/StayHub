'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { formatPrice, calcNights } from '@/lib/utils';
import type { Room, RoomType, Guest, StayPrice } from '@/types';
import { X, Search } from 'lucide-react';

interface Props {
  roomId: string;
  checkInDate: string;
  rooms: Room[];
  roomTypes: RoomType[];
  onClose: () => void;
  onCreated: () => void;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export default function QuickReservationModal({
  roomId, checkInDate, rooms, roomTypes, onClose, onCreated,
}: Props) {
  const room = rooms.find((r) => r.id === roomId);
  const roomType = roomTypes.find((t) => t.id === room?.roomTypeId);

  const minCheckOut = (() => {
    const d = new Date(checkInDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [checkOutDate, setCheckOutDate] = useState(minCheckOut);
  const [guestSearch, setGuestSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: guestResults = [] } = useSWR<Guest[]>(
    guestSearch.length >= 2 ? `/api/v1/guests?search=${encodeURIComponent(guestSearch)}` : null,
    fetcher,
  );

  const nights = calcNights(checkInDate, checkOutDate);

  // Fetch price from pricing engine
  const { data: stayPrice } = useSWR<StayPrice>(
    roomId && checkInDate && checkOutDate && nights > 0
      ? `/api/v1/rates/room/${roomId}/calculate?checkIn=${checkInDate}&checkOut=${checkOutDate}`
      : null,
    fetcher,
  );

  function selectGuest(g: Guest) {
    setGuest(g);
    setGuestSearch(`${g.firstName} ${g.lastName}`);
    setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/v1/reservations', {
        propertyId: room?.propertyId,
        roomId,
        guestId: guest.id,
        checkInDate,
        checkOutDate,
        adultsCount: 1,
        childrenCount: 0,
        notes: notes || undefined,
        source: 'direct',
      });
      onCreated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-fade-up overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Nueva reserva</h2>
            <p className="text-xs text-muted mt-0.5">
              Hab. {room?.roomNumber}
              {roomType ? ` · ${roomType.name}` : ''}
              {' · '}
              {fmtDate(checkInDate)}
            </p>
          </div>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Guest search */}
          <div className="relative">
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">Huésped</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                value={guestSearch}
                onChange={(e) => { setGuestSearch(e.target.value); setShowResults(true); setGuest(null); }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                placeholder="Buscar huésped..."
                className="input-field w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder-muted"
                required={!guest}
              />
            </div>
            {showResults && guestResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-border rounded-lg mt-1 max-h-36 overflow-y-auto shadow-xl animate-fade-up">
                {guestResults.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onMouseDown={() => selectGuest(g)}
                    className="press w-full text-left px-3 py-2 text-sm text-white hover:bg-card flex items-center justify-between"
                  >
                    <span>{g.firstName} {g.lastName}</span>
                    {g.email && <span className="text-muted text-xs">{g.email}</span>}
                  </button>
                ))}
              </div>
            )}
            {guest && (
              <p className="text-xs text-primary mt-1">✓ {guest.firstName} {guest.lastName}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Check-in</label>
              <div className="bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-[#ccc] select-none">
                {fmtDate(checkInDate)}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Check-out</label>
              <input
                type="date"
                value={checkOutDate}
                min={minCheckOut}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
                required
              />
            </div>
          </div>

          {/* Price preview */}
          {nights > 0 && (
            <div className="bg-[#0f766e0a] border border-[#0f766e22] rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">{nights} noche{nights !== 1 ? 's' : ''}</span>
                {stayPrice && (
                  <p className="text-xs text-muted mt-0.5">
                    {formatPrice(stayPrice.baseAmount / nights)}/noche
                  </p>
                )}
              </div>
              <span className="text-lg font-mono font-bold text-primary-light">
                {stayPrice
                  ? formatPrice(stayPrice.baseAmount)
                  : roomType
                  ? formatPrice(Number(roomType.basePrice) * nights)
                  : '—'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">
              Notas <span className="normal-case text-[10px]">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted resize-none"
              placeholder="Solicitudes especiales..."
            />
          </div>

          {error && <p className="text-[#f87171] text-xs animate-fade-in">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || !guest || nights === 0}
              className="press flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {submitting ? 'Creando...' : 'Confirmar reserva'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="press bg-surface border border-border text-[#ccc] text-sm px-4 py-2.5 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
