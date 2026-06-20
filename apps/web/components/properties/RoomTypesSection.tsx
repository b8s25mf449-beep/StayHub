'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, Trash2, BedDouble } from 'lucide-react';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import type { RoomType } from '@/types';

const SUGGESTED_NAMES = ['King', 'Doble', 'Triple', 'Jr Suite', 'Master Suite'];

interface Props {
  propertyId: string;
}

export default function RoomTypesSection({ propertyId }: Props) {
  const key = `/api/v1/room-types?propertyId=${propertyId}`;
  const { data: roomTypes = [], isLoading } = useSWR<RoomType[]>(key, fetcher);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', maxOccupancy: '2', basePrice: '100' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/v1/room-types', {
        propertyId,
        name: form.name.trim(),
        maxOccupancy: Number(form.maxOccupancy),
        basePrice: Number(form.basePrice),
      });
      mutate(key);
      setForm({ name: '', maxOccupancy: '2', basePrice: '100' });
      setShowForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este tipo de habitación?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/room-types/${id}`);
      mutate(key);
    } finally {
      setDeletingId(null);
    }
  }

  const unusedSuggestions = SUGGESTED_NAMES.filter(
    (s) => !roomTypes.some((rt) => rt.name.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted uppercase tracking-wider">Tipos de habitación</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="press flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          <Plus size={11} />
          Añadir
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-6 w-16 rounded-md" />)}
        </div>
      ) : roomTypes.length === 0 && !showForm ? (
        <p className="text-xs text-muted italic">Sin tipos — añade uno para poder crear habitaciones.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {roomTypes.map((rt) => (
            <div
              key={rt.id}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0f1520] border border-border text-xs text-[#ccc] transition-opacity ${
                deletingId === rt.id ? 'opacity-40' : ''
              }`}
            >
              <BedDouble size={10} className="text-muted flex-shrink-0" />
              <span>{rt.name}</span>
              <span className="text-muted">·</span>
              <span className="text-muted font-mono">{rt.maxOccupancy}p</span>
              <button
                onClick={() => handleDelete(rt.id)}
                disabled={deletingId === rt.id}
                className="press ml-0.5 opacity-0 group-hover:opacity-100 text-muted hover:text-[#f87171] transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-2 p-3 rounded-lg bg-[#080f1a] border border-border space-y-2 animate-fade-up">
          {/* Name with suggestions */}
          <div>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del tipo"
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-white placeholder-muted"
            />
            {unusedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {unusedSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, name: s })}
                    className="press px-2 py-0.5 rounded-md bg-[#0f1520] border border-border text-[10px] text-muted hover:text-primary hover:border-[#0f766e44] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted block mb-1">Máx. personas</label>
              <input
                required
                type="number"
                min="1"
                max="20"
                value={form.maxOccupancy}
                onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Precio base / noche</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {error && <p className="text-[10px] text-[#f87171]">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="press flex-1 bg-primary text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Añadir tipo'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="press bg-surface border border-border text-muted text-xs px-3 py-1.5 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
