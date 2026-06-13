'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { RefreshCw, Plus, AlertCircle, CheckCircle2, X, Pencil, Check } from 'lucide-react';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { CHANNEL_LABELS } from '@/lib/utils';
import type { ChannelConnection, Room, Property, SyncResult } from '@/types';

const CHANNEL_OPTIONS = ['booking_com', 'airbnb', 'expedia', 'ical', 'vrbo'] as const;

const CHANNEL_ICONS: Record<string, string> = {
  booking_com: '🔵',
  airbnb: '🔴',
  expedia: '🟡',
  expedia_partner: '🟡',
  ical: '📅',
  vrbo: '🟢',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:   { label: 'Activo',        className: 'bg-[#0f766e22] text-primary' },
  inactive: { label: 'Inactivo',      className: 'bg-[#1a2535] text-muted' },
  error:    { label: 'Error',         className: 'bg-[#dc262622] text-[#f87171]' },
  syncing:  { label: 'Sincronizando', className: 'bg-[#0369a122] text-[#38bdf8] animate-pulse' },
};

interface SyncFeedback {
  id: string;
  result: SyncResult;
  error?: string;
}

export default function ChannelList() {
  const { data: connections = [] } = useSWR<ChannelConnection[]>('/api/v1/channels', fetcher);
  const { data: rooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: properties = [] } = useSWR<Property[]>('/api/v1/properties', fetcher);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [feedback, setFeedback] = useState<SyncFeedback | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);
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
    setFeedback(null);
    try {
      const { data: result } = await api.post<SyncResult>(`/api/v1/channels/${id}/sync`);
      mutate('/api/v1/channels');
      setFeedback({ id, result });
      setTimeout(() => setFeedback(null), 8000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setFeedback({ id, result: { imported: 0, updated: 0, skipped: 0, errors: [] }, error: err?.response?.data?.message ?? err?.message ?? 'Error al sincronizar' });
    } finally {
      setSyncing(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/api/v1/channels', form);
      mutate('/api/v1/channels');
      setShowForm(false);
      setForm({ propertyId: '', roomId: '', channel: 'booking_com', icalUrl: '' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: ChannelConnection) {
    setEditingId(c.id);
    setEditUrl((c as { icalUrl?: string }).icalUrl ?? '');
  }

  async function handleSaveEdit(id: string) {
    if (!editUrl.trim()) return;
    setEditSaving(true);
    try {
      await api.patch(`/api/v1/channels/${id}`, { icalUrl: editUrl.trim() });
      mutate('/api/v1/channels');
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    setFeedback(null);
    try {
      await api.post('/api/v1/channels/sync-all');
      mutate('/api/v1/channels');
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta conexión?')) return;
    await api.delete(`/api/v1/channels/${id}`);
    mutate('/api/v1/channels');
  }

  return (
    <div className="space-y-4 animate-fade-up delay-50">
      {/* Sync feedback banner */}
      {feedback && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm animate-fade-up ${
          feedback.error
            ? 'bg-[#dc262615] border-[#dc262644] text-[#f87171]'
            : 'bg-[#0f766e0a] border-[#0f766e33] text-white'
        }`}>
          {feedback.error
            ? <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[#f87171]" />
            : <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-primary" />
          }
          <div className="flex-1">
            {feedback.error ? (
              <span>{feedback.error}</span>
            ) : (
              <span>
                Sync completado —{' '}
                <span className="font-medium">{feedback.result.imported} importadas</span>
                {feedback.result.updated > 0 && `, ${feedback.result.updated} actualizadas`}
                {feedback.result.skipped > 0 && `, ${feedback.result.skipped} sin cambios`}
                {feedback.result.errors.length > 0 && (
                  <span className="text-[#fb923c]"> · {feedback.result.errors.length} errores</span>
                )}
              </span>
            )}
          </div>
          <button onClick={() => setFeedback(null)} className="text-muted hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Connections table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border min-w-0">
          <span className="text-xs text-muted uppercase tracking-wider font-medium">
            {connections.length} conexiones
          </span>
          {connections.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll || !!syncing}
              className="press flex items-center gap-1.5 text-xs text-muted hover:text-white disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={syncingAll ? 'animate-spin' : ''} />
              {syncingAll ? 'Sincronizando...' : 'Sync all'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="bg-surface border-b border-border">
              {['Canal', 'Habitación', 'Estado', 'Último sync', 'Importadas', ''].map((h) => (
                <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-4 py-3 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-10 text-sm">
                  No hay conexiones. Agregá un canal para sincronizar reservas automáticamente.
                </td>
              </tr>
            ) : (
              connections.map((c) => {
                const room     = roomMap[c.roomId];
                const status   = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.inactive;
                const isSyncing  = syncing === c.id;
                const isEditing  = editingId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr className="border-t border-border group hover:bg-[#0f1520] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white flex items-center gap-2">
                          <span className="text-base leading-none">{CHANNEL_ICONS[c.channel] ?? '🌐'}</span>
                          {CHANNEL_LABELS[c.channel]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        Hab. {room?.roomNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        {c.lastError && (
                          <p className="text-[10px] text-[#f87171] mt-0.5 max-w-[160px] truncate" title={c.lastError}>
                            {c.lastError}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {c.lastSyncAt
                          ? new Date(c.lastSyncAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                        {c.lastSyncCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleSync(c.id)}
                            disabled={isSyncing}
                            className="press flex items-center gap-1.5 text-xs bg-surface border border-border text-[#ccc] px-3 py-1.5 rounded-lg disabled:opacity-40 hover:border-[#0f766e44] hover:text-white transition-colors"
                          >
                            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? '...' : 'Sync'}
                          </button>
                          <button
                            onClick={() => isEditing ? setEditingId(null) : startEdit(c)}
                            className="press text-xs text-muted hover:text-white px-2 py-1.5 rounded-lg transition-colors"
                            title="Editar URL"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="press text-xs text-muted hover:text-[#f87171] px-2 py-1.5 rounded-lg transition-colors"
                            title="Eliminar conexión"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr key={`${c.id}-edit`} className="border-t border-[#0f766e33] bg-[#0f766e05]">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted whitespace-nowrap">URL iCal:</span>
                            <input
                              type="url"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              autoFocus
                              className="input-field flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted"
                              placeholder="https://..."
                            />
                            <button
                              onClick={() => handleSaveEdit(c.id)}
                              disabled={editSaving || !editUrl.trim()}
                              className="press flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
                            >
                              <Check size={11} />
                              {editSaving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="press text-xs text-muted hover:text-white px-2 py-1.5 rounded-lg"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add connection form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="press flex items-center gap-2 text-sm bg-primary text-white px-4 py-2.5 rounded-lg font-medium"
        >
          <Plus size={14} />
          Nueva conexión
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Nueva conexión OTA</h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="text-muted hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Canal</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as typeof CHANNEL_OPTIONS[number] })}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>{CHANNEL_ICONS[c]} {CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Propiedad</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value, roomId: '' })}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
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
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-40"
              >
                <option value="">Seleccionar...</option>
                {roomsByProperty.map((r) => (
                  <option key={r.id} value={r.id}>Hab. {r.roomNumber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">
                URL iCal <span className="normal-case text-[10px] text-muted">(del OTA)</span>
              </label>
              <input
                type="url"
                value={form.icalUrl}
                onChange={(e) => setForm({ ...form, icalUrl: e.target.value })}
                placeholder="https://booking.com/hotel/ical/..."
                required
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
          </div>

          <div className="bg-[#0369a10a] border border-[#0369a122] rounded-lg px-3 py-2.5 text-xs text-[#7dd3fc]">
            <strong>¿Dónde encontrar la URL iCal?</strong><br />
            Booking.com: Extranet → Calendario → Exportar calendario →{' '}
            <span className="font-mono">ical.booking.com/...</span>
          </div>

          {formError && (
            <p className="text-xs text-[#f87171] flex items-center gap-1.5">
              <AlertCircle size={12} /> {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!form.propertyId || !form.roomId || !form.icalUrl || submitting}
              className="press bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium disabled:opacity-40"
            >
              {submitting ? 'Guardando...' : 'Guardar conexión'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="press bg-surface border border-border text-[#ccc] text-sm px-4 py-2.5 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
