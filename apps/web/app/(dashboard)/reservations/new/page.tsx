'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { calcNights } from '@/lib/utils';
import ReservationForm, { type ReservationFormData } from '@/components/reservations/ReservationForm';
import QuotationPanel from '@/components/reservations/QuotationPanel';
import type { Tenant } from '@/types';

const TAX_RATE = 0.21;

const EMPTY: ReservationFormData = {
  guest: null,
  propertyId: '',
  rooms: [{ id: crypto.randomUUID(), roomTypeId: '', adults: 1, children: 0 }],
  roomTypes: [],
  checkInDate: '',
  checkOutDate: '',
  requiresInvoice: false,
  notes: '',
};

export default function NewReservationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ReservationFormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: tenant } = useSWR<Tenant>(
    user?.tenantId ? `/api/v1/tenants/${user.tenantId}` : null,
    fetcher,
  );

  async function handleSubmit() {
    if (!formData.guest || !formData.checkInDate || !formData.checkOutDate) return;
    const validRooms = formData.rooms.filter((r) => r.roomTypeId);
    if (validRooms.length === 0) return;

    setSubmitting(true);
    setError('');

    const nights = calcNights(formData.checkInDate, formData.checkOutDate);

    try {
      // Get available rooms from the API for each room type requested
      const roomsRes = await api.get<Array<{ id: string; roomTypeId: string; propertyId: string; roomNumber: string; status: string }>>(
        `/api/v1/rooms?propertyId=${formData.propertyId}`,
      );
      const availableRooms = roomsRes.data.filter((r) => r.status === 'available');

      // Match each RoomLine to an available physical room of that type
      const assignments: Array<{ lineIdx: number; roomId: string }> = [];
      const usedIds = new Set<string>();

      for (let i = 0; i < validRooms.length; i++) {
        const line = validRooms[i];
        const match = availableRooms.find(
          (r) => r.roomTypeId === line.roomTypeId && !usedIds.has(r.id),
        );
        if (!match) {
          setError(
            `No hay habitaciones disponibles de tipo "${
              formData.roomTypes.find((t) => t.id === line.roomTypeId)?.name ?? 'seleccionado'
            }" para las fechas elegidas.`,
          );
          setSubmitting(false);
          return;
        }
        usedIds.add(match.id);
        assignments.push({ lineIdx: i, roomId: match.id });
      }

      // Create one reservation per room
      for (const { lineIdx, roomId } of assignments) {
        const line = validRooms[lineIdx];
        const rt = formData.roomTypes.find((t) => t.id === line.roomTypeId);
        const baseAmount = Number(rt?.basePrice ?? 0) * nights;
        const taxesAmount = formData.requiresInvoice ? baseAmount * TAX_RATE : 0;

        await api.post('/api/v1/reservations', {
          propertyId: formData.propertyId,
          roomId,
          guestId: formData.guest!.id,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
          adultsCount: line.adults,
          childrenCount: line.children,
          taxesAmount,
          notes: formData.notes || undefined,
          source: 'direct',
        });
      }

      router.push('/reservations');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Error al guardar la reserva');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6 animate-fade-up delay-0">
        <button
          onClick={() => router.back()}
          className="press text-muted text-sm"
        >
          ← Volver
        </button>
        <h2 className="text-lg font-semibold">Nueva reserva</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#dc262615] border border-[#dc262644] rounded-lg text-[#f87171] text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-card border border-border rounded-xl p-6 animate-fade-up delay-50">
          <ReservationForm
            value={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
        <div className="col-span-2 animate-fade-up delay-100">
          <QuotationPanel
            data={formData}
            tenantName={tenant?.name ?? 'Hotel'}
            tenantPhone={tenant?.phone ?? ''}
            tenantAddress={''}
          />
        </div>
      </div>
    </div>
  );
}
