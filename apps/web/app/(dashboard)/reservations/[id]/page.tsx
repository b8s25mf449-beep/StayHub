'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { formatDate, formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import type { Reservation, Guest, Room } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';

const EDITABLE_STATUSES = ['pending', 'confirmed', 'checked_in'] as const;

export default function ReservationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: reservation, mutate } = useSWR<Reservation>(
    id ? `/api/v1/reservations/${id}` : null,
    fetcher,
  );
  const { data: guests = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);

  const [baseAmount, setBaseAmount] = useState('');
  const [taxesAmount, setTaxesAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reservation) {
      setBaseAmount(String(Number(reservation.baseAmount) || 0));
      setTaxesAmount(String(Number(reservation.taxesAmount) || 0));
      setNotes(reservation.notes ?? '');
    }
  }, [reservation]);

  const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  async function handleSave() {
    if (!reservation) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const base = Number(baseAmount) || 0;
      const taxes = Number(taxesAmount) || 0;
      await api.patch(`/api/v1/reservations/${id}`, {
        baseAmount: base,
        taxesAmount: taxes,
        totalAmount: base + taxes,
        notes: notes || undefined,
      });
      await mutate();
      globalMutate('/api/v1/reservations');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(status: string) {
    if (!reservation) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/reservations/${id}`, { status });
      await mutate();
      globalMutate('/api/v1/reservations');
    } finally {
      setSaving(false);
    }
  }

  if (!reservation) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const guest = guestMap[reservation.guestId];
  const room = roomMap[reservation.roomId];
  const canEdit = EDITABLE_STATUSES.includes(reservation.status as typeof EDITABLE_STATUSES[number]);

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-up delay-0">
        <button
          onClick={() => router.back()}
          className="press text-muted text-sm flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Volver
        </button>
        <span className="text-border">·</span>
        <h2 className="text-lg font-semibold">{reservation.confirmationNumber}</h2>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>

      <div className="space-y-4 animate-fade-up delay-50">
        {/* Info card */}
        <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Huésped</p>
            <p className="text-white font-medium">
              {guest ? `${guest.firstName} ${guest.lastName}` : '—'}
            </p>
            {guest?.email && <p className="text-muted text-xs mt-0.5">{guest.email}</p>}
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Habitación</p>
            <p className="text-white font-medium">Hab. {room?.roomNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Check-in</p>
            <p className="text-[#ccc]">{formatDate(reservation.checkInDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Check-out</p>
            <p className="text-[#ccc]">{formatDate(reservation.checkOutDate)}</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-xs text-muted uppercase tracking-wider">Montos</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                Monto base (ARS)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                disabled={!canEdit || saving}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                IVA / Impuestos (ARS)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={taxesAmount}
                onChange={(e) => setTaxesAmount(e.target.value)}
                disabled={!canEdit || saving}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Total preview */}
          <div className="bg-[#0f766e0a] border border-[#0f766e22] rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted">Total</span>
            <span className="text-lg font-mono font-bold text-primary-light">
              {formatPrice((Number(baseAmount) || 0) + (Number(taxesAmount) || 0))}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Notas <span className="normal-case text-[10px]">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={!canEdit || saving}
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted resize-none disabled:opacity-50"
              placeholder="Solicitudes especiales, notas de pago..."
            />
          </div>

          {error && <p className="text-xs text-[#f87171]">{error}</p>}
          {saved && <p className="text-xs text-primary animate-fade-in">✓ Guardado correctamente</p>}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="press flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>

        {/* Status actions */}
        {reservation.status === 'pending' && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-muted uppercase tracking-wider">Acciones</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleStatus('checked_in')}
                disabled={saving}
                className="press flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0369a122] text-[#38bdf8] border border-[#0369a133] hover:bg-[#0369a133] disabled:opacity-40 transition-colors"
              >
                Check In
              </button>
              <button
                onClick={() => handleStatus('confirmed')}
                disabled={saving}
                className="press flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0f766e22] text-primary border border-[#0f766e33] hover:bg-[#0f766e33] disabled:opacity-40 transition-colors"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
