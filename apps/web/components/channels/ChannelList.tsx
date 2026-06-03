'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { CHANNEL_LABELS, formatDate } from '@/lib/utils';
import type { ChannelConnection, Room, Property } from '@/types';

const CHANNEL_OPTIONS = ['booking_com', 'airbnb', 'expedia', 'ical', 'vrbo'] as const;

const CONN_STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#0f766e22] text-[#0f766e]',
  inactive: 'bg-[#1a2535] text-[#4a5a6c]',
  error: 'bg-[#dc262622] text-[#f87171]',
  syncing: 'bg-[#0369a122] text-[#38bdf8]',
};

export default function ChannelList() {
  const { data: connections = [] } = useSWR<ChannelConnection[]>('/api/v1/channels', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: properties = [] } = useSWR<Property[]>('/api/v1/properties', fetcher);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    roomId: '',
    channel: 'booking_com' as typeof CHANNEL_OPTIONS[number],
    icalUrl: '',
  });

  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const roomsByProperty = rooms.filter((r) => r.propertyId === form.propertyId);

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      await api.post(`/api/v1/channels/${id}/sync`);
      mutate('/api/v1/channels');
    } finally {
      setSyncing(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/api/v1/channels', form);
    mutate('/api/v1/channels');
    setShowForm(false);
    setForm({ propertyId: '', roomId: '', channel: 'booking_com', icalUrl: '' });
  }

  return (
    <div>
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="bg-surface">
              {['Canal', 'Habitación', 'Estado', 'Último sync', 'Reservas', ''].map((h) => (
                <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-8 text-sm">
                  No hay conexiones. Agregá un canal para sincronizar reservas.
                </td>
              </tr>
            )}
            {connections.map((c) => {
              const room = roomMap[c.roomId];
              return (
                <tr key={c.id} className="border-t border-border hover:bg-[#0f1520]">
                  <td className="px-4 py-3 text-white text-sm font-medium">
                    {CHANNEL_LABELS[c.channel]}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    Hab. {room?.roomNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CONN_STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.lastSyncAt ? formatDate(c.lastSyncAt.split('T')[0]) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {c.lastSyncCount ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSync(c.id)}
                      disabled={syncing === c.id}
                      className="text-xs bg-surface border border-border hover:border-primary text-[#ccc] hover:text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                    >
                      {syncing === c.id ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm bg-primary hover:bg-[#0d6962] text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva conexión
        </button>
      ) : (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Nueva conexión OTA</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Canal</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as typeof CHANNEL_OPTIONS[number] })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Propiedad</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value, roomId: '' })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="">Seleccionar...</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Habitación</label>
              <select
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                disabled={!form.propertyId}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none disabled:opacity-40"
              >
                <option value="">Seleccionar...</option>
                {roomsByProperty.map((r) => <option key={r.id} value={r.id}>Hab. {r.roomNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">URL iCal del OTA</label>
              <input
                type="url"
                value={form.icalUrl}
                onChange={(e) => setForm({ ...form, icalUrl: e.target.value })}
                placeholder="https://..."
                required
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-primary hover:bg-[#0d6962] text-white text-sm px-4 py-2 rounded-lg">
              Guardar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-surface border border-border text-[#ccc] text-sm px-4 py-2 rounded-lg hover:border-muted">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
