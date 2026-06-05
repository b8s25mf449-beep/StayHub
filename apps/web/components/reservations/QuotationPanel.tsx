'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileDown, Loader2, AlertCircle } from 'lucide-react';
import { formatPrice, calcNights } from '@/lib/utils';
import type { ReservationFormData } from './ReservationForm';
import type { QuotationRoom } from '@/components/pdf/QuotationDocument';
import type { Room, RoomType, StayPrice } from '@/types';
import { fetcher } from '@/lib/api';

interface Props {
  data: ReservationFormData;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
}

const TAX_RATE = 0.21;

/** Fetches price for a single room via pricing engine */
function useRoomPrice(roomId: string, checkIn: string, checkOut: string) {
  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  return useSWR<StayPrice>(
    roomId && nights > 0
      ? `/api/v1/rates/room/${roomId}/calculate?checkIn=${checkIn}&checkOut=${checkOut}`
      : null,
    fetcher,
  );
}

/** Single room price row — hooks must be at top level, so we split into a component */
function RoomPriceLine({
  line,
  allRooms,
  allTypes,
  checkIn,
  checkOut,
}: {
  line: { roomId: string; adults: number; children: number };
  allRooms: Room[];
  allTypes: RoomType[];
  checkIn: string;
  checkOut: string;
}) {
  const { data: stayPrice } = useRoomPrice(line.roomId, checkIn, checkOut);
  const room = allRooms.find((r) => r.id === line.roomId);
  const type = room ? allTypes.find((t) => t.id === room.roomTypeId) : undefined;

  if (!room) return null;

  const subtotal = stayPrice?.baseAmount ?? 0;
  const hasPrice = subtotal > 0;

  return (
    <div className="flex items-start justify-between gap-2 animate-fade-up">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">
          Hab. {room.roomNumber}{type ? ` — ${type.name}` : ''}
        </p>
        <p className="text-xs text-muted">
          {line.adults} adulto{line.adults !== 1 ? 's' : ''}
          {line.children > 0 ? `, ${line.children} niño${line.children !== 1 ? 's' : ''}` : ''}
        </p>
        {stayPrice && hasPrice && (
          <p className="text-[10px] text-muted">
            {formatPrice(stayPrice.baseAmount / stayPrice.nights)}/noche × {stayPrice.nights}
          </p>
        )}
        {stayPrice && !hasPrice && (
          <p className="text-[10px] text-[#fb923c] flex items-center gap-1 mt-0.5">
            <AlertCircle size={9} />
            Sin tarifa — configurá en Habitaciones
          </p>
        )}
      </div>
      <span className={`text-sm font-mono font-medium flex-shrink-0 ${hasPrice ? 'text-white' : 'text-muted'}`}>
        {hasPrice ? formatPrice(subtotal) : '—'}
      </span>
    </div>
  );
}

export default function QuotationPanel({ data, tenantName, tenantPhone, tenantAddress }: Props) {
  const [downloading, setDownloading] = useState(false);

  /* Fetch rooms + types for display (SWR caches — no extra network cost) */
  const { data: allRooms = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: allTypes = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);

  const nights = data.checkInDate && data.checkOutDate
    ? calcNights(data.checkInDate, data.checkOutDate)
    : 0;

  const validRooms = data.rooms.filter((r) => r.roomId);
  const hasData = validRooms.length > 0 && nights > 0;

  /* We can't call hooks conditionally so we always render the room lines component */
  const canDownload = !!data.guest && hasData;

  async function buildPdf(rooms: QuotationRoom[], filename: string) {
    const { pdf } = await import('@react-pdf/renderer');
    const { QuotationDocument } = await import('@/components/pdf/QuotationDocument');
    const React = (await import('react')).default;
    const subtotal = rooms.reduce((s, r) => s + r.subtotal, 0);
    const roomIva = data.requiresInvoice ? subtotal * TAX_RATE : 0;
    const blob = await pdf(React.createElement(QuotationDocument, {
      tenantName, tenantPhone, tenantAddress,
      guestName: data.guest ? `${data.guest.firstName} ${data.guest.lastName}` : '',
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights,
      rooms,
      grandSubtotal: subtotal,
      requiresInvoice: data.requiresInvoice,
      iva: roomIva,
      totalWithTax: subtotal + roomIva,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Cotización</h3>

      {!hasData ? (
        <p className="text-muted text-sm text-center py-8">
          Seleccioná habitación y fechas para ver la cotización
        </p>
      ) : (
        <QuotationContent
          data={data}
          allRooms={allRooms}
          allTypes={allTypes}
          nights={nights}
          canDownload={canDownload}
          downloading={downloading}
          setDownloading={setDownloading}
          buildPdf={buildPdf}
          tenantName={tenantName}
          tenantPhone={tenantPhone}
          tenantAddress={tenantAddress}
        />
      )}
    </div>
  );
}

/** Separated so RoomPriceLine hooks are always called in a stable tree */
function QuotationContent({
  data, allRooms, allTypes, nights, canDownload, downloading, setDownloading, buildPdf,
}: {
  data: ReservationFormData;
  allRooms: Room[];
  allTypes: RoomType[];
  nights: number;
  canDownload: boolean;
  downloading: boolean;
  setDownloading: (v: boolean) => void;
  buildPdf: (rooms: QuotationRoom[], filename: string) => Promise<void>;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
}) {
  /* Collect per-room prices (each RoomPriceLine fetches its own price via hook) */
  const validRooms = data.rooms.filter((r) => r.roomId);

  return (
    <div className="space-y-1">
      {/* Room price lines — one per selected room */}
      <div className="space-y-3 mb-4">
        {validRooms.map((line) => (
          <RoomPriceLine
            key={line.id}
            line={line}
            allRooms={allRooms}
            allTypes={allTypes}
            checkIn={data.checkInDate}
            checkOut={data.checkOutDate}
          />
        ))}
      </div>

      {/* Summary footer */}
      <PriceSummary
        data={data}
        allRooms={allRooms}
        nights={nights}
        canDownload={canDownload}
        downloading={downloading}
        setDownloading={setDownloading}
        buildPdf={buildPdf}
      />
    </div>
  );
}

/** Fetches total price for all rooms combined */
function PriceSummary({
  data, allRooms, nights, canDownload, downloading, setDownloading, buildPdf,
}: {
  data: ReservationFormData;
  allRooms: Room[];
  nights: number;
  canDownload: boolean;
  downloading: boolean;
  setDownloading: (v: boolean) => void;
  buildPdf: (rooms: QuotationRoom[], filename: string) => Promise<void>;
}) {
  const TAX_RATE = 0.21;

  /* Fetch prices for each room */
  const validRooms = data.rooms.filter((r) => r.roomId);

  /* Use separate hooks per room (max 5 rooms, always same count during a session) */
  const p0 = useRoomPrice(validRooms[0]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p1 = useRoomPrice(validRooms[1]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p2 = useRoomPrice(validRooms[2]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p3 = useRoomPrice(validRooms[3]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p4 = useRoomPrice(validRooms[4]?.roomId ?? '', data.checkInDate, data.checkOutDate);

  const prices = [p0, p1, p2, p3, p4].slice(0, validRooms.length);
  const grandSubtotal = prices.reduce((s, p, i) => {
    if (!validRooms[i]) return s;
    return s + (p.data?.baseAmount ?? 0);
  }, 0);

  const iva = data.requiresInvoice ? grandSubtotal * TAX_RATE : 0;
  const totalWithTax = grandSubtotal + iva;
  const hasAnyPrice = grandSubtotal > 0;

  async function downloadAll() {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const rooms: QuotationRoom[] = validRooms.map((line, i) => {
        const room = allRooms.find((r) => r.id === line.roomId);
        return {
          roomName: `Hab. ${room?.roomNumber ?? '?'}`,
          adults: line.adults,
          children: line.children,
          pricePerNight: prices[i]?.data ? (prices[i].data!.baseAmount / nights) : 0,
          subtotal: prices[i]?.data?.baseAmount ?? 0,
        };
      });
      const slug = `${data.guest!.firstName}-${data.guest!.lastName}`.toLowerCase();
      await buildPdf(rooms, `cotizacion-${slug}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex justify-between text-xs text-muted">
          <span>{nights} noche{nights !== 1 ? 's' : ''} · {validRooms.length} hab.</span>
          {hasAnyPrice && <span className="font-mono">{formatPrice(grandSubtotal)}</span>}
        </div>
        <div className="pt-1 space-y-0.5">
          <p className="text-xs text-primary">✓ Desayuno incluido</p>
          <p className="text-xs text-primary">✓ Estacionamiento gratuito</p>
        </div>
      </div>

      <div className="border-t border-border pt-3 mt-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted uppercase tracking-wider">Total</span>
          <span className={`font-mono font-bold text-lg ${hasAnyPrice ? 'text-white' : 'text-muted'}`}>
            {hasAnyPrice ? formatPrice(grandSubtotal) : '—'}
          </span>
        </div>
      </div>

      {data.requiresInvoice && hasAnyPrice && (
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

      <div className="pt-4">
        <button
          onClick={downloadAll}
          disabled={!canDownload || downloading}
          className="press w-full flex items-center justify-center gap-2 bg-surface border border-border text-[#ccc] py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Descargar cotización PDF
        </button>
      </div>
    </>
  );
}
