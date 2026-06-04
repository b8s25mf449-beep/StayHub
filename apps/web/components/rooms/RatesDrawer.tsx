'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { RoomRate, Room, RoomType } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';

interface Props {
  room: Room;
  roomType: RoomType | undefined;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '',
  pricePerNight: '',
  startDate: '',
  endDate: '',
  priority: '0',
};

export default function RatesDrawer({ room, roomType, onClose }: Props) {
  const { data: rates = [], isLoading } = useSWR<RoomRate[]>(
    `/api/v1/rates?roomId=${room.id}`,
    fetcher,
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/v1/rates', {
        roomId: room.id,
        name: form.name,
        pricePerNight: Number(form.pricePerNight),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        priority: Number(form.priority),
      });
      mutate(`/api/v1/rates?roomId=${room.id}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setError(anyErr?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/api/v1/rates/${id}`);
      mutate(`/api/v1/rates?roomId=${room.id}`);
    } catch {
      setError('Error al eliminar la tarifa');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 ml-auto w-full max-w-sm h-full bg-surface border-l border-border flex flex-col animate-fade-up shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Tarifas — Hab. {room.roomNumber}</h2>
            {roomType && (
              <p className="text-xs text-muted mt-0.5">
                Precio base: {formatPrice(Number(roomType.basePrice))} / noche
              </p>
            )}
          </div>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
            </div>
          )}

          {!isLoading && rates.length === 0 && (
            <p className="text-muted text-xs text-center py-6">
              Sin tarifas programadas. Se usa el precio base del tipo de habitación.
            </p>
          )}

          {rates.map((rate, i) => (
            <div
              key={rate.id}
              className="bg-card border border-border rounded-lg p-3 flex items-start justify-between animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{rate.name}</p>
                  {rate.priority > 0 && (
                    <span className="text-[10px] bg-[#0f766e22] text-primary px-1.5 py-0.5 rounded">
                      P{rate.priority}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-primary-light mt-0.5">
                  {formatPrice(Number(rate.pricePerNight))} / noche
                </p>
                {(rate.startDate || rate.endDate) && (
                  <p className="text-[10px] text-muted mt-1">
                    {rate.startDate ?? '—'} → {rate.endDate ?? '—'}
                  </p>
                )}
                {!rate.startDate && !rate.endDate && (
                  <p className="text-[10px] text-muted mt-1">Todas las fechas</p>
                )}
                {rate.minNights && (
                  <p className="text-[10px] text-muted mt-0.5">Mín. {rate.minNights} noches</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(rate.id)}
                disabled={deleting === rate.id}
                className="press text-muted nav-hover-danger p-1.5 rounded-lg ml-2 flex-shrink-0 disabled:opacity-40"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="press w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2.5 text-sm font-medium"
            >
              <Plus size={14} />
              Nueva tarifa
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3 animate-fade-up">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Nombre</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Temporada alta"
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted"
                />
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Precio por noche</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                  placeholder="15000"
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Desde</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Prioridad (mayor = prevalece)</label>
                <input
                  type="number"
                  min="0"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              {error && <p className="text-[#f87171] text-xs animate-fade-in">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="press flex-1 bg-primary text-white rounded-lg py-2 text-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="press bg-surface border border-border text-[#ccc] text-sm px-3 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
