'use client';

import { formatPrice, calcNights } from '@/lib/utils';
import type { ReservationFormData } from './ReservationForm';

interface Props {
  data: ReservationFormData;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
}

const TAX_RATE = 0.21;

export default function QuotationPanel({ data, tenantName, tenantPhone, tenantAddress }: Props) {
  const nights = data.checkInDate && data.checkOutDate
    ? calcNights(data.checkInDate, data.checkOutDate)
    : 0;

  const pricePerNight = Number(data.roomType?.basePrice ?? 0);
  const subtotal = pricePerNight * nights;
  const iva = data.requiresInvoice ? subtotal * TAX_RATE : 0;
  const totalWithTax = subtotal + iva;

  const hasRoom = !!data.room && !!data.roomType && nights > 0;

  async function handleDownloadPdf() {
    if (!hasRoom || !data.guest) return;
    const { pdf } = await import('@react-pdf/renderer');
    const { QuotationDocument } = await import('@/components/pdf/QuotationDocument');
    const React = (await import('react')).default;
    const element = React.createElement(QuotationDocument, {
      tenantName,
      tenantPhone,
      tenantAddress,
      guestName: `${data.guest.firstName} ${data.guest.lastName}`,
      adultsCount: data.adultsCount,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights,
      roomName: data.roomType?.name ?? '',
      roomNumber: data.room?.roomNumber ?? '',
      pricePerNight,
      subtotal,
      requiresInvoice: data.requiresInvoice,
      iva,
      totalWithTax,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(element as any).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizacion-${data.guest.firstName}-${data.guest.lastName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Cotización</h3>

      {!hasRoom ? (
        <p className="text-muted text-sm text-center py-8">
          Seleccioná habitación y fechas para ver la cotización
        </p>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-white text-sm font-medium">
              {data.roomType?.name} (Hab. {data.room?.roomNumber})
            </span>
            <span className="text-muted text-xs">{nights} noche{nights !== 1 ? 's' : ''}</span>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">
                {formatPrice(pricePerNight)}/noche × {nights}
              </span>
              <span className="text-white font-mono">{formatPrice(subtotal)}</span>
            </div>

            <div className="pt-2 space-y-1">
              <p className="text-xs text-primary">✓ Desayuno incluido</p>
              <p className="text-xs text-primary">✓ Estacionamiento gratuito</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted uppercase tracking-wider">Total (sin impuestos)</span>
              <span className="text-white font-mono font-bold text-lg">{formatPrice(subtotal)}</span>
            </div>
          </div>

          {data.requiresInvoice && (
            <div className="border-t border-border pt-3 mt-1 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">IVA (21%)</span>
                <span className="text-[#ccc] font-mono">{formatPrice(iva)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted font-medium">Total con factura</span>
                <span className="text-white font-mono font-bold">{formatPrice(totalWithTax)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={!data.guest}
            className="w-full mt-4 bg-surface border border-border hover:border-primary text-[#ccc] hover:text-white py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          >
            Descargar cotización PDF
          </button>
        </div>
      )}
    </div>
  );
}
