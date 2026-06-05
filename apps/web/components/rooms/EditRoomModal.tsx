'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import type { Room, RoomType } from '@/types';
import { X } from 'lucide-react';

interface Props {
  room: Room;
  onClose: () => void;
}

export default function EditRoomModal({ room, onClose }: Props) {
  const { data: roomTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);

  const [form, setForm] = useState({
    roomTypeId: room.roomTypeId,
    roomNumber: room.roomNumber,
    floor: room.floor ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put(`/api/v1/rooms/${room.id}`, {
        roomTypeId: form.roomTypeId,
        roomNumber: form.roomNumber,
        floor: form.floor || undefined,
      });
      mutate('/api/v1/rooms');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Error al guardar');
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
      <div className="relative z-10 w-full max-w-sm bg-surface border border-border rounded-xl p-6 animate-fade-up shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Editar habitación {room.roomNumber}</h2>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">
              Tipo de habitación
            </label>
            <select
              required
              value={form.roomTypeId}
              onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">
                Número
              </label>
              <input
                required
                type="text"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">
                Piso
              </label>
              <input
                type="text"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="—"
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
              {loading ? 'Guardando...' : 'Guardar cambios'}
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
