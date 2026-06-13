'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Eye, Move, AlertCircle } from 'lucide-react';
import { calcNights } from '@/lib/utils';
import type { Room, RoomType, Reservation, Guest } from '@/types';
import QuickReservationModal from './QuickReservationModal';

/* ── Layout constants ──────────────────── */
const CELL_W    = 52;
const ROW_H     = 52;
const LABEL_W   = 168;
const DAYS      = 30;
const PAST_DAYS = 3;
// Two sticky header rows: month (~28px) + day (~48px)
const HEADER_H  = 76;

/* ── Helpers ────────────────────────────── */
const DAY_ABBR  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function addDaysUTC(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function localDate(iso: string) {
  const [y, m, da] = iso.split('-').map(Number);
  return new Date(y, m - 1, da);
}
function shiftISO(iso: string, n: number): string {
  const [y, m, da] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, da + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Channel visual config ──────────────── */
const SOURCE_CFG: Record<string, { bg: string; letter: string }> = {
  booking_com: { bg: '#003B95', letter: 'B' },
  airbnb:      { bg: '#FF385C', letter: 'A' },
  expedia:     { bg: '#1b4fa5', letter: 'E' },
  ical:        { bg: '#0f766e', letter: 'C' },
  direct:      { bg: '#7c3aed', letter: 'D' },
  phone:       { bg: '#b45309', letter: 'T' },
  walk_in:     { bg: '#b45309', letter: 'W' },
};

/* ── Types ──────────────────────────────── */
type CalendarMode = 'view' | 'move';
type DragType     = 'move' | 'resize';

interface DragState {
  resId:          string;
  originalRes:    Reservation;
  dragType:       DragType;
  startDayIdx:    number;
  currentCheckIn: string;
  currentCheckOut:string;
  currentRoomId:  string;
  hasMoved:       boolean;
}

interface TooltipInfo { res: Reservation; guest: Guest | undefined; x: number; y: number; }
interface QuickCreate  { roomId: string; checkInDate: string; }

/* ═══════════════════════════════════════════ */
export default function PmsCalendar() {
  const [mode,        setMode]        = useState<CalendarMode>('view');
  const [drag,        setDrag]        = useState<DragState | null>(null);
  const [dragError,   setDragError]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [tooltip,     setTooltip]     = useState<TooltipInfo | null>(null);
  const [quickCreate, setQuickCreate] = useState<QuickCreate | null>(null);

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - PAST_DAYS);
    return d;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  // Always-current refs so event handlers don't go stale between renders
  const dragRef   = useRef<DragState | null>(null);
  const roomsRef  = useRef<Room[]>([]);

  /* Data */
  const { data: rooms        = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: roomTypes    = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests       = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);

  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  function setDragSync(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  const typeMap  = Object.fromEntries(roomTypes.map(t => [t.id, t]));
  const guestMap = Object.fromEntries(guests.map(g => [g.id, g]));

  /* Day arrays */
  const days    = Array.from({ length: DAYS }, (_, i) => addDaysUTC(startDate, i));
  const dayStrs = days.map(toISO);
  const _t = new Date();
  const todayStr = `${_t.getFullYear()}-${String(_t.getMonth()+1).padStart(2,'0')}-${String(_t.getDate()).padStart(2,'0')}`;

  /* Month header groups */
  const monthGroups: { label: string; count: number }[] = [];
  for (const d of days) {
    const label = `${MONTH_ABR[d.getUTCMonth()].toUpperCase()} ${d.getUTCFullYear()}`;
    if (!monthGroups.length || monthGroups[monthGroups.length - 1].label !== label)
      monthGroups.push({ label, count: 1 });
    else
      monthGroups[monthGroups.length - 1].count++;
  }

  /* Navigation */
  function navigate(weeks: number) { setStartDate(prev => addDaysUTC(prev, weeks * 7)); }
  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - PAST_DAYS);
    setStartDate(d);
  }

  /* Day index relative to startDate */
  function dayIdx(iso: string) {
    return Math.round((localDate(iso).getTime() - startDate.getTime()) / 86_400_000);
  }

  /* Pixel → calendar position (reads refs for freshness in event handlers) */
  function clientXToDayIdx(clientX: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.floor((clientX - rect.left + el.scrollLeft - LABEL_W) / CELL_W);
  }

  function clientYToRoomIdx(clientY: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const relY  = clientY - rect.top - HEADER_H;
    return Math.max(0, Math.min(roomsRef.current.length - 1, Math.floor(relY / ROW_H)));
  }

  /* ── Window-level mouse handlers ─────────
     Registered once when drag starts, torn down when it ends.
     Uses dragRef + roomsRef to always read latest values.       */
  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;

    function onMove(e: MouseEvent) {
      const prev = dragRef.current;
      if (!prev) return;

      const curDayIdx = clientXToDayIdx(e.clientX);
      const deltaDays = curDayIdx - prev.startDayIdx;

      let next: DragState;
      if (prev.dragType === 'move') {
        const rowIdx  = clientYToRoomIdx(e.clientY);
        const newRoom = roomsRef.current[rowIdx]?.id ?? prev.currentRoomId;
        next = {
          ...prev,
          currentCheckIn:  shiftISO(prev.originalRes.checkInDate,  deltaDays),
          currentCheckOut: shiftISO(prev.originalRes.checkOutDate, deltaDays),
          currentRoomId:   newRoom,
          hasMoved: deltaDays !== 0 || newRoom !== prev.originalRes.roomId,
        };
      } else {
        const newOut = shiftISO(prev.originalRes.checkOutDate, deltaDays);
        const minOut = shiftISO(prev.originalRes.checkInDate,  1);
        next = {
          ...prev,
          currentCheckOut: newOut > minOut ? newOut : minOut,
          hasMoved: true,
        };
      }
      setDragSync(next);
    }

    async function onUp() {
      const current = dragRef.current;
      setDragSync(null);
      if (!current?.hasMoved) return;

      setSaving(true);
      try {
        await api.patch(`/api/v1/reservations/${current.resId}`, {
          checkInDate:  current.currentCheckIn,
          checkOutDate: current.currentCheckOut,
          roomId:       current.currentRoomId,
        });
        setDragError(null);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setDragError(e?.response?.data?.message ?? 'Conflicto de fechas — reserva revertida');
      } finally {
        setSaving(false);
        swrMutate('/api/v1/reservations');
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    document.body.style.cursor     = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  function startDrag(e: React.MouseEvent, res: Reservation, dragType: DragType) {
    if (mode !== 'move') return;
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    setDragError(null);
    setDragSync({
      resId:          res.id,
      originalRes:    res,
      dragType,
      startDayIdx:    clientXToDayIdx(e.clientX),
      currentCheckIn: res.checkInDate,
      currentCheckOut:res.checkOutDate,
      currentRoomId:  res.roomId,
      hasMoved:       false,
    });
  }

  /* Reservations visible for a room in the current window */
  function getRoomRes(roomId: string): Reservation[] {
    return reservations.filter(r => {
      if (r.roomId !== roomId) return false;
      if (['cancelled','no_show'].includes(r.status)) return false;
      if (dayIdx(r.checkOutDate) <= 0) return false;
      if (dayIdx(r.checkInDate)  >= DAYS) return false;
      return true;
    });
  }

  /* Block geometry */
  interface BlockGeom { left: number; width: number; roundLeft: boolean; roundRight: boolean; }
  function blockGeom(checkIn: string, checkOut: string): BlockGeom | null {
    const s = Math.max(0, dayIdx(checkIn));
    const e = Math.min(DAYS, dayIdx(checkOut));
    if (e <= s) return null;
    return {
      left:       s * CELL_W + 1,
      width:      (e - s) * CELL_W - 2,
      roundLeft:  dayIdx(checkIn)  >= 0,
      roundRight: dayIdx(checkOut) <= DAYS,
    };
  }

  function handleCellClick(roomId: string, iso: string) {
    if (mode === 'move') return;
    if (iso < todayStr) return;
    const busy = reservations.some(r =>
      r.roomId === roomId &&
      !['cancelled','no_show'].includes(r.status) &&
      iso >= r.checkInDate && iso < r.checkOutDate
    );
    if (!busy) setQuickCreate({ roomId, checkInDate: iso });
  }

  /* ── Render one reservation block ──────── */
  function renderBlock(
    res: Reservation,
    checkIn: string,
    checkOut: string,
    opts: { ghost?: boolean; isDragTarget?: boolean } = {},
  ) {
    const geom = blockGeom(checkIn, checkOut);
    if (!geom) return null;

    const g         = guestMap[res.guestId];
    const src       = SOURCE_CFG[res.source] ?? SOURCE_CFG.ical;
    const nights    = calcNights(checkIn, checkOut);
    const nightly   = nights > 0 ? Math.round(Number(res.totalAmount || res.baseAmount) / nights) : 0;
    const isBlocked   = res.status === 'checked_out';
    const isCheckedIn = res.status === 'checked_in';
    const { ghost, isDragTarget } = opts;

    const br = `${geom.roundLeft ? 6 : 0}px ${geom.roundRight ? 6 : 0}px ${geom.roundRight ? 6 : 0}px ${geom.roundLeft ? 6 : 0}px`;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      top: 5, bottom: 5,
      left: geom.left,
      width: geom.width,
      borderRadius: br,
      overflow: 'hidden',
      userSelect: 'none',
    };

    /* Checked-out = diagonal stripe, no text */
    if (isBlocked) {
      return (
        <div
          key={res.id + (ghost ? '-g' : '')}
          style={{
            ...baseStyle,
            background: ghost
              ? 'transparent'
              : 'repeating-linear-gradient(135deg,#1a2535 0px,#1a2535 5px,#1e2d42 5px,#1e2d42 10px)',
            border: ghost ? '2px dashed #334155' : '1px solid #253447',
            opacity: ghost ? 0.35 : 1,
            cursor: mode === 'move' ? 'grab' : 'pointer',
          }}
          onMouseDown={(e) => startDrag(e, res, 'move')}
          onClick={(e) => {
            if (mode === 'move') return;
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({ res, guest: g, x: rect.left, y: rect.bottom + 6 });
          }}
        />
      );
    }

    /* Regular reservation block */
    return (
      <div
        key={res.id + (ghost ? '-g' : isDragTarget ? '-d' : '')}
        style={{
          ...baseStyle,
          background: ghost ? 'transparent' : src.bg,
          border: ghost
            ? '2px dashed rgba(255,255,255,0.25)'
            : isDragTarget
            ? '2px solid rgba(255,255,255,0.6)'
            : isCheckedIn
            ? '2px solid rgba(255,255,255,0.25)'
            : '1px solid rgba(255,255,255,0.07)',
          opacity: ghost ? 0.22 : saving && isDragTarget ? 0.7 : 1,
          boxShadow: isDragTarget ? '0 6px 24px rgba(0,0,0,0.55)' : '0 1px 4px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center',
          paddingLeft: geom.roundLeft ? 5 : 8,
          paddingRight: 6,
          gap: 5,
          cursor: mode === 'move' ? (isDragTarget ? 'grabbing' : 'grab') : 'pointer',
        }}
        onMouseDown={(e) => startDrag(e, res, 'move')}
        onClick={(e) => {
          if (mode === 'move') return;
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltip({ res, guest: g, x: rect.left, y: rect.bottom + 6 });
        }}
      >
        {/* Channel badge */}
        {!ghost && geom.roundLeft && (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{src.letter}</span>
          </div>
        )}

        {/* Name + rate */}
        {!ghost && (
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {g && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {isDragTarget
                  ? `${g.lastName} · ${checkIn} → ${checkOut}`
                  : g.lastName}
              </span>
            )}
            {nightly > 0 && geom.width > 80 && !isDragTarget && (
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
                ${nightly.toLocaleString('es-MX')}/noche
              </span>
            )}
          </div>
        )}

        {/* En casa pill */}
        {!ghost && isCheckedIn && geom.width > 100 && (
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>En casa</span>
          </div>
        )}

        {/* Resize handle — visible only in move mode on the right edge */}
        {!ghost && mode === 'move' && geom.roundRight && (
          <div
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
              cursor: 'ew-resize',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '0 6px 6px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={(e) => { e.stopPropagation(); startDrag(e, res, 'resize'); }}
          >
            <div style={{ width: 2, height: 14, background: 'rgba(255,255,255,0.35)', borderRadius: 1 }} />
          </div>
        )}
      </div>
    );
  }

  /* ── JSX ────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3">

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate(-1)} className="press w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-white transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={goToday} className="press px-3 h-8 rounded-lg bg-surface border border-border text-xs font-medium text-[#ccc] hover:text-white transition-colors">
            Hoy
          </button>
          <button onClick={() => navigate(1)} className="press w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-white transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setMode('view')}
              className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'view' ? 'bg-card text-white shadow-sm' : 'text-muted hover:text-[#ccc]'
              }`}
            >
              <Eye size={12} />
              Vista
            </button>
            <button
              onClick={() => { setMode('move'); setTooltip(null); }}
              className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'move' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-[#ccc]'
              }`}
            >
              <Move size={12} />
              Mover
            </button>
          </div>

          {/* Channel legend */}
          {(['booking_com','airbnb','direct','ical'] as const).map(src => {
            const cfg = SOURCE_CFG[src];
            return (
              <div key={src} className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: cfg.bg }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{cfg.letter}</span>
                </div>
                <span className="text-[10px] text-muted">{src.replace('_com','').replace('_',' ')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move-mode hint */}
      {mode === 'move' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f766e10] border border-[#0f766e33] text-xs text-primary">
          <Move size={12} />
          Modo mover — arrastrá las reservas para cambiar fechas o habitación. El borde derecho ajusta el checkout.
          {saving && <span className="text-muted ml-auto animate-pulse">Guardando…</span>}
        </div>
      )}

      {/* Drag error */}
      {dragError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#dc262615] border border-[#dc262644] text-xs text-[#f87171]">
          <AlertCircle size={12} />
          {dragError}
          <button onClick={() => setDragError(null)} className="ml-auto text-muted hover:text-white">✕</button>
        </div>
      )}

      {/* ── Calendar grid ─────────────────── */}
      <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-border bg-card">
        <div style={{ minWidth: LABEL_W + DAYS * CELL_W }}>

          {/* Month header */}
          <div className="flex border-b border-border" style={{ background: '#080f1a', position: 'sticky', top: 0, zIndex: 21 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W, position: 'sticky', left: 0, zIndex: 30, background: '#080f1a' }}
              className="flex-shrink-0 border-r border-border" />
            {monthGroups.map((mg, i) => (
              <div key={i} style={{ width: mg.count * CELL_W, minWidth: mg.count * CELL_W }}
                className="flex-shrink-0 flex items-center justify-center border-r border-border py-1.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{mg.label}</span>
              </div>
            ))}
          </div>

          {/* Day header */}
          <div className="flex border-b border-border" style={{ background: '#0d1623', position: 'sticky', top: 28, zIndex: 20 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W, position: 'sticky', left: 0, zIndex: 30, background: '#0d1623' }}
              className="flex-shrink-0 border-r border-border flex items-center px-3 py-2">
              <span className="text-[10px] text-muted uppercase tracking-widest">Habitación</span>
            </div>
            {days.map((d, i) => {
              const iso = dayStrs[i];
              const isToday   = iso === todayStr;
              const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
              return (
                <div key={iso} style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center py-1.5 border-r border-border ${
                    isToday ? 'bg-[#003B9522]' : isWeekend ? 'bg-[#ffffff03]' : ''
                  }`}
                >
                  <span className={`text-[9px] uppercase mb-0.5 ${isToday ? 'text-primary font-bold' : 'text-muted'}`}>{DAY_ABBR[d.getUTCDay()]}</span>
                  <span className={`text-[13px] font-mono font-bold ${isToday ? 'text-primary' : 'text-[#ccc]'}`}>{d.getUTCDate()}</span>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {rooms.length === 0 && (
            <div className="flex items-center justify-center text-muted text-sm py-20">
              No hay habitaciones.
            </div>
          )}

          {rooms.map((room, rowIdx) => {
            const rt       = typeMap[room.roomTypeId];
            const baseRate = rt?.basePrice ?? 0;
            const rowBg    = rowIdx % 2 === 0 ? '#0d1623' : '#0e1a2e';
            const roomRes  = getRoomRes(room.id);

            const dragFromHere   = drag?.originalRes.roomId === room.id;
            const dragTargetHere = drag?.currentRoomId === room.id && drag.dragType === 'move';

            return (
              <div key={room.id} className="flex border-b border-border" style={{ height: ROW_H }}>

                {/* Room label (sticky left) */}
                <div style={{ width: LABEL_W, minWidth: LABEL_W, height: ROW_H, position: 'sticky', left: 0, zIndex: 10, background: rowBg }}
                  className="flex-shrink-0 flex items-center gap-2.5 px-3 border-r border-border"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-mono font-bold text-white leading-tight">#{room.roomNumber}</span>
                    {rt && <span className="text-[10px] text-muted leading-tight truncate">{rt.name}</span>}
                  </div>
                </div>

                {/* Day cells + blocks */}
                <div className="relative flex flex-shrink-0" style={{ height: ROW_H }}>

                  {/* Background cells */}
                  {dayStrs.map((iso, di) => {
                    const isToday   = iso === todayStr;
                    const isWeekend = days[di].getUTCDay() === 0 || days[di].getUTCDay() === 6;
                    const isPast    = iso < todayStr;

                    // Occupied? (excluding block that was moved to another room)
                    const normallyOccupied = roomRes.some(r => {
                      if (drag?.resId === r.id && drag.dragType === 'move' && drag.currentRoomId !== room.id) return false;
                      return iso >= r.checkInDate && iso < r.checkOutDate;
                    });

                    const hasDragTarget = dragTargetHere && drag != null &&
                      iso >= drag.currentCheckIn && iso < drag.currentCheckOut;

                    return (
                      <div key={iso}
                        style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H }}
                        className={`flex-shrink-0 border-r border-border flex items-center justify-center ${
                          hasDragTarget   ? 'bg-[#0f766e18]' :
                          isToday         ? 'bg-[#003B9510]' :
                          isWeekend       ? 'bg-[#ffffff02]' : ''
                        } ${!isPast && !normallyOccupied && mode === 'view' ? 'cursor-pointer hover:bg-[#0f766e0f]' : 'cursor-default'}`}
                        onClick={() => handleCellClick(room.id, iso)}
                      >
                        {!normallyOccupied && baseRate > 0 && (
                          <span className={`text-[10px] font-mono ${isPast ? 'text-[#1a2535]' : 'text-[#243451]'}`}>
                            {Math.round(baseRate).toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* ── Reservation blocks ── */}

                  {roomRes.map((res) => {
                    const isBeingDragged = drag?.resId === res.id;

                    if (!isBeingDragged) {
                      return renderBlock(res, res.checkInDate, res.checkOutDate);
                    }

                    if (drag!.dragType === 'resize') {
                      // Resize stays in same room, only checkout changes
                      return renderBlock(res, res.checkInDate, drag!.currentCheckOut, { isDragTarget: true });
                    }

                    // Move: if dragged to another room show ghost here, live block appears in target room
                    if (drag!.currentRoomId !== room.id) {
                      return renderBlock(res, res.checkInDate, res.checkOutDate, { ghost: true });
                    }
                    // Same room: show at new dates
                    return renderBlock(res, drag!.currentCheckIn, drag!.currentCheckOut, { isDragTarget: true });
                  })}

                  {/* Live drag block when the reservation moved INTO this (different) room */}
                  {dragTargetHere && drag != null && !dragFromHere &&
                    renderBlock(drag.originalRes, drag.currentCheckIn, drag.currentCheckOut, { isDragTarget: true })
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tooltip (view mode only) ── */}
      {tooltip && mode === 'view' && (() => {
        const src = SOURCE_CFG[tooltip.res.source] ?? SOURCE_CFG.ical;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />
            <div className="fixed z-50 bg-[#0d1623] border border-border rounded-xl shadow-2xl p-4 w-72"
              style={{
                top:  Math.min(tooltip.y, window.innerHeight - 240),
                left: Math.min(tooltip.x, window.innerWidth - 300),
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: src.bg }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{src.letter}</span>
                  </div>
                  <span className="text-xs font-medium text-white capitalize">
                    {tooltip.res.source.replace('_com','').replace('_',' ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted">{tooltip.res.confirmationNumber}</span>
              </div>
              {tooltip.guest && (
                <p className="text-base font-bold text-white mb-0.5">
                  {tooltip.guest.firstName} {tooltip.guest.lastName}
                </p>
              )}
              {tooltip.guest?.email && <p className="text-xs text-muted mb-3">{tooltip.guest.email}</p>}
              <div className="space-y-1.5 border-t border-border pt-3 mb-3">
                {([
                  ['Check-in',  tooltip.res.checkInDate],
                  ['Check-out', tooltip.res.checkOutDate],
                  ['Noches',    String(calcNights(tooltip.res.checkInDate, tooltip.res.checkOutDate))],
                  ['Total',     `$${Number(tooltip.res.totalAmount || tooltip.res.baseAmount).toLocaleString('es-MX')}`],
                ] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="text-muted">{l}</span>
                    <span className={l === 'Total' ? 'text-primary font-mono font-bold' : 'text-white font-mono'}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <a href={`/reservations/${tooltip.res.id}`}
                  className="press flex-1 text-center text-xs bg-primary text-white py-2 rounded-lg font-medium">
                  Ver reserva
                </a>
                <button onClick={() => setTooltip(null)}
                  className="press text-xs bg-surface border border-border text-muted px-3 py-2 rounded-lg">
                  Cerrar
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Quick-create modal ── */}
      {quickCreate && (
        <QuickReservationModal
          roomId={quickCreate.roomId}
          checkInDate={quickCreate.checkInDate}
          rooms={rooms}
          roomTypes={roomTypes}
          onClose={() => setQuickCreate(null)}
          onCreated={() => { setQuickCreate(null); swrMutate('/api/v1/reservations'); }}
        />
      )}
    </div>
  );
}
