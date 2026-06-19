'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { ROOM_STATUS_COLORS, ROOM_STATUS_LABELS } from '@/lib/utils';
import type { Room, RoomType } from '@/types';
import { Pencil, DollarSign, Trash2, Check, Building2 } from 'lucide-react';
import Link from 'next/link';
import RatesDrawer from './RatesDrawer';
import EditRoomModal from './EditRoomModal';
import { useProperty } from '@/lib/property-context';

const STATUS_OPTIONS: Room['status'][] = ['available', 'occupied', 'cleaning', 'maintenance'];

export default function RoomGrid() {
  const { activeProperty } = useProperty();
  const roomsKey = activeProperty ? `/api/v1/rooms?propertyId=${activeProperty.id}` : null;
  const { data: rooms = [] } = useSWR<Room[]>(roomsKey, fetcher);
  const { data: roomTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [ratesRoom, setRatesRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null);

  const typeMap = Object.fromEntries(roomTypes.map((t) => [t.id, t]));

  async function updateStatus(room: Room, status: Room['status']) {
    setUpdating(room.id);
    try {
      await api.put(`/api/v1/rooms/${room.id}`, { status });
      mutate(roomsKey);
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(room: Room) {
    setDeleting(room.id);
    setConfirmDelete(null);
    try {
      await api.delete(`/api/v1/rooms/${room.id}`);
      mutate(roomsKey);
    } finally {
      setDeleting(null);
    }
  }

  if (!activeProperty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 size={32} className="text-muted mb-3" />
        <p className="text-sm text-muted mb-3">Selecciona una propiedad para ver sus habitaciones.</p>
        <Link href="/settings/properties" className="text-xs text-primary hover:underline">
          Gestionar propiedades →
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Legend */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${ROOM_STATUS_COLORS[s].split(' ')[0]}`} />
            <span className="text-xs text-muted">{ROOM_STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <p className="text-muted text-sm text-center py-10">
          No hay habitaciones. Creá la primera con el botón de arriba.
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2">
        {rooms.map((room, i) => {
          const rt = typeMap[room.roomTypeId];
          const isDeleting = deleting === room.id;

          return (
            <div
              key={room.id}
              className={`room-card relative rounded-lg p-2.5 text-center cursor-pointer group animate-fade-up ${
                isDeleting ? 'opacity-40 pointer-events-none' : ''
              } ${ROOM_STATUS_COLORS[room.status]}`}
              style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
            >
              <p className="text-sm font-bold font-mono">{room.roomNumber}</p>
              <p className="text-[9px] mt-0.5 opacity-70 truncate">{rt?.name ?? '—'}</p>

              {/* Hover dropdown */}
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg py-1 hidden group-hover:block shadow-xl min-w-[130px]">
                {/* Status section */}
                <div className="px-3 py-1 border-b border-border mb-1">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Estado</p>
                </div>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); updateStatus(room, s); }}
                    disabled={room.status === s || updating === room.id}
                    className="press w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-card disabled:opacity-40"
                  >
                    <Check
                      size={10}
                      className={`flex-shrink-0 transition-opacity ${room.status === s ? 'opacity-100 text-primary' : 'opacity-0'}`}
                    />
                    {ROOM_STATUS_LABELS[s]}
                  </button>
                ))}

                {/* Actions section */}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditRoom(room); }}
                    className="press w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-card"
                  >
                    <Pencil size={11} className="flex-shrink-0" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRatesRoom(room); }}
                    className="press w-full flex items-center gap-2 px-3 py-1.5 text-xs text-primary hover:bg-card"
                  >
                    <DollarSign size={11} className="flex-shrink-0" />
                    Tarifas
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(room); }}
                    className="press w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#f87171] hover:bg-card"
                  >
                    <Trash2 size={11} className="flex-shrink-0" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-surface border border-border rounded-xl p-6 animate-fade-up shadow-2xl">
            <h3 className="text-base font-semibold mb-2">Eliminar habitación</h3>
            <p className="text-sm text-muted mb-5">
              ¿Eliminar la habitación{' '}
              <span className="text-white font-mono">{confirmDelete.roomNumber}</span>
              {typeMap[confirmDelete.roomTypeId] && (
                <> ({typeMap[confirmDelete.roomTypeId].name})</>
              )}
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="press flex-1 bg-[#dc2626] text-white rounded-lg py-2.5 text-sm font-medium"
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="press flex-1 bg-surface border border-border text-[#ccc] text-sm rounded-lg py-2.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editRoom && (
        <EditRoomModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          onManageRates={(r) => { setEditRoom(null); setRatesRoom(r); }}
        />
      )}

      {/* Rates drawer */}
      {ratesRoom && (
        <RatesDrawer
          room={ratesRoom}
          roomType={typeMap[ratesRoom.roomTypeId]}
          onClose={() => setRatesRoom(null)}
        />
      )}
    </>
  );
}
