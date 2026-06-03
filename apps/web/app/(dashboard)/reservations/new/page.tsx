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

const EMPTY: ReservationFormData = {
  guest: null,
  propertyId: '',
  room: null,
  roomType: null,
  checkInDate: '',
  checkOutDate: '',
  adultsCount: 1,
  childrenCount: 0,
  requiresInvoice: false,
  notes: '',
};

const TAX_RATE = 0.21;

export default function NewReservationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ReservationFormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: tenant } = useSWR<Tenant>(
    user?.tenantId ? `/api/v1/tenants/${user.tenantId}` : null,
    fetcher
  );

  async function handleSubmit() {
    if (!formData.guest || !formData.room || !formData.checkInDate || !formData.checkOutDate) return;
    setSubmitting(true);
    setError('');

    const nights = calcNights(formData.checkInDate, formData.checkOutDate);
    const baseAmount = Number(formData.roomType?.basePrice ?? 0) * nights;
    const taxesAmount = formData.requiresInvoice ? baseAmount * TAX_RATE : 0;

    try {
      await api.post('/api/v1/reservations', {
        propertyId: formData.propertyId,
        roomId: formData.room.id,
        guestId: formData.guest.id,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        adultsCount: formData.adultsCount,
        childrenCount: formData.childrenCount,
        baseAmount,
        taxesAmount,
        totalAmount: baseAmount + taxesAmount,
        notes: formData.notes || undefined,
        source: 'direct',
      });
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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted hover:text-white text-sm transition-colors">
          ← Volver
        </button>
        <h2 className="text-lg font-semibold">Nueva reserva</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#dc262615] border border-[#dc262644] rounded-lg text-[#f87171] text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-card border border-border rounded-xl p-6">
          <ReservationForm
            value={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
        <div className="col-span-2">
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
