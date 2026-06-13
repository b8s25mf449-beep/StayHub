'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileDown, Loader2, AlertCircle, Pencil, X, CheckSquare } from 'lucide-react';
import { formatPrice, calcNights } from '@/lib/utils';
import type { ReservationFormData } from './ReservationForm';
import type { RoomLine } from './RoomSelectionManager';
import type { QuotationRoom } from '@/components/pdf/QuotationDocument';
import type { ConfirmationRoom } from '@/components/pdf/ConfirmationDocument';
import type { Room, RoomType, StayPrice } from '@/types';
import { fetcher } from '@/lib/api';

interface Props {
  data: ReservationFormData;
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  onRoomsChange?: (rooms: RoomLine[]) => void;
}

const TAX_RATE = 0.21;

function useRoomPrice(roomId: string, checkIn: string, checkOut: string) {
  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  return useSWR<StayPrice>(
    roomId && nights > 0
      ? `/api/v1/rates/room/${roomId}/calculate?checkIn=${checkIn}&checkOut=${checkOut}`
      : null,
    fetcher,
  );
}

/** Price row per room — with inline editing */
function RoomPriceLine({
  line,
  lineIdx,
  allRooms,
  allTypes,
  checkIn,
  checkOut,
  onPriceOverride,
}: {
  line: RoomLine;
  lineIdx: number;
  allRooms: Room[];
  allTypes: RoomType[];
  checkIn: string;
  checkOut: string;
  onPriceOverride?: (price: number | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  const { data: stayPrice } = useRoomPrice(line.roomId, checkIn, checkOut);
  const room = allRooms.find((r) => r.id === line.roomId);
  const type = room ? allTypes.find((t) => t.id === room.roomTypeId) : undefined;

  if (!room) return null;

  const engineTotal = stayPrice?.baseAmount ?? 0;
  const subtotal    = line.customPrice ?? engineTotal;
  const hasPrice    = subtotal > 0;
  const isOverride  = line.customPrice != null;

  function startEdit() {
    setDraft(String(line.customPrice ?? engineTotal ?? ''));
    setEditing(true);
  }

  function saveEdit() {
    const val = parseFloat(draft.replace(/,/g, '.'));
    onPriceOverride?.(isNaN(val) || val <= 0 ? undefined : val);
    setEditing(false);
  }

  function clearOverride() {
    onPriceOverride?.(undefined);
    setEditing(false);
  }

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${lineIdx * 40}ms` }}>
      <div className="flex items-start justify-between gap-2">
        {/* Left: room name + meta */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            Hab. {room.roomNumber}{type ? ` — ${type.name}` : ''}
          </p>
          <p className="text-xs text-muted">
            {line.adults} adulto{line.adults !== 1 ? 's' : ''}
            {line.children > 0 ? `, ${line.children} niño${line.children !== 1 ? 's' : ''}` : ''}
          </p>
          {isOverride ? (
            <p className="text-[10px] text-[#fb923c] mt-0.5">precio modificado</p>
          ) : stayPrice && hasPrice ? (
            <p className="text-[10px] text-muted">
              {formatPrice(engineTotal / stayPrice.nights)}/noche × {stayPrice.nights}
            </p>
          ) : stayPrice && !hasPrice ? (
            <p className="text-[10px] text-[#fb923c] flex items-center gap-1 mt-0.5">
              <AlertCircle size={9} />
              Sin tarifa
            </p>
          ) : null}
        </div>

        {/* Right: price + edit */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {editing ? (
            /* ── Edit mode ── */
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                className="input-field w-24 bg-surface border border-[#0f766e55] rounded-md px-2 py-1 text-sm text-white font-mono text-right"
                placeholder="0"
              />
              <button
                type="button"
                onClick={saveEdit}
                className="press p-1 rounded bg-primary text-white"
                title="Guardar"
              >
                <CheckSquare size={13} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="press p-1 rounded text-muted hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            /* ── Display mode ── */
            <>
              <span className={`text-sm font-mono font-medium ${isOverride ? 'text-[#fb923c]' : hasPrice ? 'text-white' : 'text-muted'}`}>
                {hasPrice ? formatPrice(subtotal) : '—'}
              </span>
              {onPriceOverride && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="press p-1 rounded text-muted hover:text-primary transition-colors"
                    title="Modificar precio"
                  >
                    <Pencil size={11} />
                  </button>
                  {isOverride && (
                    <button
                      type="button"
                      onClick={clearOverride}
                      className="press p-1 rounded text-muted hover:text-[#f87171] transition-colors"
                      title="Restaurar precio original"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuotationPanel({ data, tenantName, tenantPhone, tenantAddress, onRoomsChange }: Props) {
  const [dlQuote, setDlQuote]    = useState(false);
  const [dlConfirm, setDlConfirm] = useState(false);

  const { data: allRooms = [] }  = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: allTypes = [] }  = useSWR<RoomType[]>('/api/v1/room-types', fetcher);

  const nights    = data.checkInDate && data.checkOutDate ? calcNights(data.checkInDate, data.checkOutDate) : 0;
  const validRooms = data.rooms.filter((r) => r.roomId);
  const hasData   = validRooms.length > 0 && nights > 0;

  const pendingGuestValid = !!data.pendingGuest?.firstName.trim() && !!data.pendingGuest?.lastName.trim();
  const canDownload = (!!data.guest || pendingGuestValid) && hasData;

  function updateLinePrice(lineId: string, price: number | undefined) {
    if (!onRoomsChange) return;
    onRoomsChange(data.rooms.map((r) => r.id === lineId ? { ...r, customPrice: price } : r));
  }

  async function loadLogoBase64(): Promise<string | undefined> {
    try {
      const res = await fetch('/logo-travertino.jpg');
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { return undefined; }
  }

  function buildRoomRows(prices: StayPrice[]): { quotation: QuotationRoom[]; confirmation: ConfirmationRoom[] } {
    const rows = validRooms.map((line, i) => {
      const room        = allRooms.find((r) => r.id === line.roomId);
      const engineTotal = prices[i]?.baseAmount ?? 0;
      const subtotal    = line.customPrice ?? engineTotal;
      return {
        roomName:     `Hab. ${room?.roomNumber ?? '?'}`,
        adults:       line.adults,
        children:     line.children,
        pricePerNight: subtotal > 0 && nights > 0 ? subtotal / nights : 0,
        subtotal,
      };
    });
    return { quotation: rows, confirmation: rows };
  }

  async function downloadQuotation() {
    if (!canDownload) return;
    setDlQuote(true);
    try {
      const { pdf }               = await import('@react-pdf/renderer');
      const { QuotationDocument } = await import('@/components/pdf/QuotationDocument');
      const React                 = (await import('react')).default;
      // Fetch prices for each room sequentially
      const prices: StayPrice[] = await Promise.all(
        validRooms.map((line) =>
          fetch(`/api/v1/rates/room/${line.roomId}/calculate?checkIn=${data.checkInDate}&checkOut=${data.checkOutDate}`)
            .then((r) => r.ok ? r.json() : { baseAmount: 0, nights })
            .catch(() => ({ baseAmount: 0, nights })),
        ),
      );
      const { quotation: rooms } = buildRoomRows(prices);
      const subtotal    = rooms.reduce((s, r) => s + r.subtotal, 0);
      const roomIva     = data.requiresInvoice ? subtotal * TAX_RATE : 0;
      const logoBase64  = await loadLogoBase64();
      const guestName   = data.guest
        ? `${data.guest.firstName} ${data.guest.lastName}`
        : data.pendingGuest ? `${data.pendingGuest.firstName} ${data.pendingGuest.lastName}` : '';
      const blob = await pdf(React.createElement(QuotationDocument, {
        tenantName, tenantPhone, tenantAddress, logoBase64, guestName,
        checkInDate: data.checkInDate, checkOutDate: data.checkOutDate, nights,
        rooms, grandSubtotal: subtotal,
        requiresInvoice: data.requiresInvoice, iva: roomIva, totalWithTax: subtotal + roomIva,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = `cotizacion-${guestName.replace(/\s+/g, '-').toLowerCase()}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setDlQuote(false); }
  }

  async function downloadConfirmation() {
    if (!canDownload) return;
    setDlConfirm(true);
    try {
      const { pdf }                  = await import('@react-pdf/renderer');
      const { ConfirmationDocument } = await import('@/components/pdf/ConfirmationDocument');
      const React                    = (await import('react')).default;
      const prices: StayPrice[] = await Promise.all(
        validRooms.map((line) =>
          fetch(`/api/v1/rates/room/${line.roomId}/calculate?checkIn=${data.checkInDate}&checkOut=${data.checkOutDate}`)
            .then((r) => r.ok ? r.json() : { baseAmount: 0, nights })
            .catch(() => ({ baseAmount: 0, nights })),
        ),
      );
      const { confirmation: rooms } = buildRoomRows(prices);
      const subtotal    = rooms.reduce((s, r) => s + r.subtotal, 0);
      const roomIva     = data.requiresInvoice ? subtotal * TAX_RATE : 0;
      const logoBase64  = await loadLogoBase64();
      const guestName   = data.guest
        ? `${data.guest.firstName} ${data.guest.lastName}`
        : data.pendingGuest ? `${data.pendingGuest.firstName} ${data.pendingGuest.lastName}` : '';
      const blob = await pdf(React.createElement(ConfirmationDocument, {
        tenantName, tenantPhone, tenantAddress, logoBase64, guestName,
        checkInDate: data.checkInDate, checkOutDate: data.checkOutDate, nights,
        rooms, grandSubtotal: subtotal,
        requiresInvoice: data.requiresInvoice, iva: roomIva, totalWithTax: subtotal + roomIva,
        notes: data.notes || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = `confirmacion-${guestName.replace(/\s+/g, '-').toLowerCase()}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setDlConfirm(false); }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Cotización</h3>

      {!hasData ? (
        <p className="text-muted text-sm text-center py-8">
          Seleccioná habitación y fechas para ver la cotización
        </p>
      ) : (
        <PriceBody
          data={data}
          allRooms={allRooms}
          allTypes={allTypes}
          nights={nights}
          validRooms={validRooms}
          canDownload={canDownload}
          dlQuote={dlQuote}
          dlConfirm={dlConfirm}
          onDownloadQuotation={downloadQuotation}
          onDownloadConfirmation={downloadConfirmation}
          onPriceOverride={onRoomsChange ? updateLinePrice : undefined}
        />
      )}
    </div>
  );
}

/** Separated so per-room hooks are always called in a stable tree */
function PriceBody({
  data, allRooms, allTypes, nights, validRooms,
  canDownload, dlQuote, dlConfirm,
  onDownloadQuotation, onDownloadConfirmation, onPriceOverride,
}: {
  data: ReservationFormData;
  allRooms: Room[];
  allTypes: RoomType[];
  nights: number;
  validRooms: RoomLine[];
  canDownload: boolean;
  dlQuote: boolean;
  dlConfirm: boolean;
  onDownloadQuotation: () => void;
  onDownloadConfirmation: () => void;
  onPriceOverride?: (lineId: string, price: number | undefined) => void;
}) {
  const p0 = useRoomPrice(validRooms[0]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p1 = useRoomPrice(validRooms[1]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p2 = useRoomPrice(validRooms[2]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p3 = useRoomPrice(validRooms[3]?.roomId ?? '', data.checkInDate, data.checkOutDate);
  const p4 = useRoomPrice(validRooms[4]?.roomId ?? '', data.checkInDate, data.checkOutDate);

  const prices     = [p0, p1, p2, p3, p4].slice(0, validRooms.length);
  const grandTotal = prices.reduce((s, p, i) => {
    if (!validRooms[i]) return s;
    return s + (validRooms[i].customPrice ?? p.data?.baseAmount ?? 0);
  }, 0);
  const hasAnyPrice = grandTotal > 0;
  const TAX_RATE    = 0.21;
  const iva         = data.requiresInvoice ? grandTotal * TAX_RATE : 0;
  const totalWithTax = grandTotal + iva;

  return (
    <div className="space-y-1">
      {/* Room price rows */}
      <div className="space-y-3 mb-4">
        {validRooms.map((line, idx) => (
          <RoomPriceLine
            key={line.id}
            line={line}
            lineIdx={idx}
            allRooms={allRooms}
            allTypes={allTypes}
            checkIn={data.checkInDate}
            checkOut={data.checkOutDate}
            onPriceOverride={onPriceOverride ? (price) => onPriceOverride(line.id, price) : undefined}
          />
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex justify-between text-xs text-muted">
          <span>{nights} noche{nights !== 1 ? 's' : ''} · {validRooms.length} hab.</span>
          {hasAnyPrice && <span className="font-mono">{formatPrice(grandTotal)}</span>}
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
            {hasAnyPrice ? formatPrice(grandTotal) : '—'}
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

      {/* Download buttons */}
      <div className="pt-4 space-y-2">
        <button
          onClick={onDownloadQuotation}
          disabled={!canDownload || dlQuote}
          className="press w-full flex items-center justify-center gap-2 bg-surface border border-border text-[#ccc] py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {dlQuote ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Descargar cotización
        </button>
        <button
          onClick={onDownloadConfirmation}
          disabled={!canDownload || dlConfirm}
          className="press w-full flex items-center justify-center gap-2 bg-[#0f766e15] border border-[#0f766e44] text-primary py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {dlConfirm ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
          Confirmación de reserva
        </button>
      </div>
    </div>
  );
}
