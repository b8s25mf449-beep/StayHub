'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import type { Property, RoomType } from '@/types';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function NewRoomModal({ onClose }: Props) {
  const { data: properties = [] } = useSWR<Property[]>('/api/v1/properties', fetcher);
  const { data: roomTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);

  const [form, setForm] = useState({
    propertyId: '',
    roomTypeId: '',
    roomNumber: '',
    floor: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roomTypesByProperty = roomTypes.filter(
    (rt) => !form.propertyId || rt.propertyId === form.propertyId,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/v1/rooms', {
        propertyId: form.propertyId,
        roomTypeId: form.roomTypeId,
        roomNumber: form.roomNumber,
        floor: form.floor || undefined,
      });
      mutate('/api/v1/rooms');
      onClose();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setError(anyErr?.response?.data?.message ?? 'Error al crear la habitación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-xl p-6 animate-fade-up shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Nueva habitación</h2>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">Propiedad</label>
            <select
              required
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value, roomTypeId: '' })}
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
            >
              <option value="">Seleccionar...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">Tipo de habitación</label>
            <select
              required
              value={form.roomTypeId}
              onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
              disabled={!form.propertyId}
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-40"
            >
              <option value="">Seleccionar...</option>
              {roomTypesByProperty.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} — ${Number(rt.basePrice).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Número</label>
              <input
                required
                type="text"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                placeholder="101"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Piso</label>
              <input
                type="text"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="1"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
          </div>

          {error && <p className="text-[#f87171] text-xs animate-fade-in">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="press flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear habitación'}
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
