'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { formatPrice, calcNights } from '@/lib/utils';
import type { ReservationFormData } from './ReservationForm';
import type { QuotationRoom } from '@/components/pdf/QuotationDocument';

interface Props {
  data: ReservationFormData;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
}

const TAX_RATE = 0.21;

export default function QuotationPanel({ data, tenantName, tenantPhone, tenantAddress }: Props) {
  const [downloading, setDownloading] = useState(false);

  const nights = data.checkInDate && data.checkOutDate
    ? calcNights(data.checkInDate, data.checkOutDate)
    : 0;

  const roomLines: QuotationRoom[] = data.rooms
    .map((r) => {
      const physical = data.availableRooms?.find((p) => p.id === r.roomId);
      const rt = physical
        ? data.roomTypes.find((t) => t.id === physical.roomTypeId)
        : undefined;
      if (!physical || !rt) return null;
      const pricePerNight = Number(rt.basePrice);
      return {
        roomName: `${rt.name} (Hab. ${physical.roomNumber})`,
        adults: r.adults,
        children: r.children,
        pricePerNight,
        subtotal: pricePerNight * nights,
      } satisfies QuotationRoom;
    })
    .filter((r): r is QuotationRoom => r !== null);

  const grandSubtotal = roomLines.reduce((s, r) => s + r.subtotal, 0);
  const iva = data.requiresInvoice ? grandSubtotal * TAX_RATE : 0;
  const totalWithTax = grandSubtotal + iva;

  const canDownload = !!data.guest && roomLines.length > 0 && nights > 0;

  async function buildAndDownloadPdf(rooms: QuotationRoom[], filename: string) {
    const { pdf } = await import('@react-pdf/renderer');
    const { QuotationDocument } = await import('@/components/pdf/QuotationDocument');
    const React = (await import('react')).default;

    const subtotal = rooms.reduce((s, r) => s + r.subtotal, 0);
    const roomIva = data.requiresInvoice ? subtotal * TAX_RATE : 0;

    const element = React.createElement(QuotationDocument, {
      tenantName,
      tenantPhone,
      tenantAddress,
      guestName: data.guest ? `${data.guest.firstName} ${data.guest.lastName}` : '',
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights,
      rooms,
      grandSubtotal: subtotal,
      requiresInvoice: data.requiresInvoice,
      iva: roomIva,
      totalWithTax: subtotal + roomIva,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(element as any).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAll() {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const guestSlug = `${data.guest!.firstName}-${data.guest!.lastName}`.toLowerCase();
      await buildAndDownloadPdf(roomLines, `cotizacion-${guestSlug}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPerRoom() {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const guestSlug = `${data.guest!.firstName}-${data.guest!.lastName}`.toLowerCase();
      for (let i = 0; i < roomLines.length; i++) {
        await buildAndDownloadPdf(
          [roomLines[i]],
          `cotizacion-${guestSlug}-hab${i + 1}.pdf`,
        );
      }
    } finally {
      setDownloading(false);
    }
  }

  const hasData = roomLines.length > 0 && nights > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Cotización</h3>

      {!hasData ? (
        <p className="text-muted text-sm text-center py-8">
          Seleccioná tipo de habitación y fechas para ver la cotización
        </p>
      ) : (
        <div className="space-y-1">
          {/* Room lines */}
          <div className="space-y-2 mb-4">
            {roomLines.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div>
                  <span className="text-white text-sm font-medium">{r.roomName}</span>
                  <span className="text-muted text-xs ml-2">
                    {r.adults}A{r.children > 0 ? `+${r.children}N` : ''}
                  </span>
                </div>
                <span className="text-white font-mono text-sm">{formatPrice(r.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{nights} noche{nights !== 1 ? 's' : ''} · {roomLines.length} hab.</span>
              <span>{formatPrice(grandSubtotal)}</span>
            </div>

            <div className="pt-1 space-y-1">
              <p className="text-xs text-primary">✓ Desayuno incluido</p>
              <p className="text-xs text-primary">✓ Estacionamiento gratuito</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted uppercase tracking-wider">Total</span>
              <span className="text-white font-mono font-bold text-lg">
                {formatPrice(grandSubtotal)}
              </span>
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

          {/* Download buttons */}
          <div className="pt-4 space-y-2">
            <button
              onClick={handleDownloadAll}
              disabled={!canDownload || downloading}
              className="press w-full flex items-center justify-center gap-2 bg-surface border border-border text-[#ccc] py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileDown size={14} />
              )}
              {roomLines.length === 1 ? 'Descargar cotización PDF' : 'Descargar cotización completa'}
            </button>

            {roomLines.length > 1 && (
              <button
                onClick={handleDownloadPerRoom}
                disabled={!canDownload || downloading}
                className="press w-full flex items-center justify-center gap-2 bg-surface border border-border text-muted py-2 rounded-lg text-xs disabled:opacity-40"
              >
                <FileDown size={12} />
                Descargar PDF por habitación ({roomLines.length} archivos)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
