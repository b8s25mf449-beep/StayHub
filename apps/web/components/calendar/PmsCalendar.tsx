'use client';

import { useState } from 'react';
import useSWR, { mutate as swrMutate } from 'swr';
import { fetcher } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Room, RoomType, Reservation, Guest } from '@/types';
import QuickReservationModal from './QuickReservationModal';

/* ── Layout constants ─────────────────── */
const CELL_W  = 42;   // px per day column
const ROW_H   = 48;   // px per room row
const LABEL_W = 148;  // px for left room-name column
const DAYS    = 30;   // days visible at once

/* ── Helpers ─────────────────────────── */
const DAY_ABBR  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}
function localDate(iso: string) {
  const [y, m, da] = iso.split('-').map(Number);
  return new Date(y, m - 1, da);
}

/* ── Status palette ──────────────────── */
const PALETTE: Record<string, { bar: string; text: string; dot: string }> = {
  confirmed:   { bar: '#0f766e', text: '#fff',     dot: '#14b8a6' },
  checked_in:  { bar: '#0369a1', text: '#fff',     dot: '#38bdf8' },
  pending:     { bar: '#b45309', text: '#fff',     dot: '#fbbf24' },
  checked_out: { bar: '#334155', text: '#94a3b8',  dot: '#475569' },
  inquiry:     { bar: '#6d28d9', text: '#fff',     dot: '#a78bfa' },
};
const STATUS_LABEL: Record<string, string> = {
  confirmed:   'Confirmada',
  checked_in:  'Check-in',
  pending:     'Pendiente',
  checked_out: 'Check-out',
  inquiry:     'Consulta',
};

/* ── Tooltip state ───────────────────── */
interface TooltipInfo {
  res: Reservation;
  guest: Guest | undefined;
  x: number;
  y: number;
}

interface QuickCreate {
  roomId: string;
  checkInDate: string;
}

/* ═══════════════════════════════════════════════════ */
export default function PmsCalendar() {
  /* Date range */
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  /* UI state */
  const [tooltip, setTooltip]       = useState<TooltipInfo | null>(null);
  const [quickCreate, setQuickCreate] = useState<QuickCreate | null>(null);

  /* Data */
  const { data: rooms       = [] } = useSWR<Room[]>('/api/v1/rooms', fetcher);
  const { data: roomTypes   = [] } = useSWR<RoomType[]>('/api/v1/room-types', fetcher);
  const { data: reservations= [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);
  const { data: guests      = [] } = useSWR<Guest[]>('/api/v1/guests', fetcher);

  const typeMap  = Object.fromEntries(roomTypes.map(t => [t.id, t]));
  const guestMap = Object.fromEntries(guests.map(g => [g.id, g]));

  /* Generate day array */
  const days    = Array.from({ length: DAYS }, (_, i) => addDays(startDate, i));
  const dayStrs = days.map(toISO);
  const todayStr = toISO(new Date());

  /* Navigation */
  function navigate(weeks: number) {
    setStartDate(prev => addDays(prev, weeks * 7));
  }
  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    setStartDate(d);
  }

  /* Day index relative to startDate (can be negative or > DAYS) */
  function dayIdx(iso: string): number {
    const d = localDate(iso);
    return Math.round((d.getTime() - startDate.getTime()) / 86_400_000);
  }

  /* Reservations for a room that overlap the visible window */
  function getRoomRes(roomId: string): Reservation[] {
    return reservations.filter(r => {
      if (r.roomId !== roomId) return false;
      if (['cancelled', 'no_show'].includes(r.status)) return false;
      return dayIdx(r.checkOutDate) > 0 && dayIdx(r.checkInDate) < DAYS;
    });
  }

  /* Block geometry */
  function blockGeom(res: Reservation) {
    const s = Math.max(0, dayIdx(res.checkInDate));
    const e = Math.min(DAYS, dayIdx(res.checkOutDate));
    if (e <= s) return null;
    const startsVisible = dayIdx(res.checkInDate) >= 0;
    const endsVisible   = dayIdx(res.checkOutDate) <= DAYS;
    return {
      left:          s * CELL_W + 1,
      width:         (e - s) * CELL_W - 3,
      roundLeft:     startsVisible,
      roundRight:    endsVisible,
    };
  }

  /* Click on empty cell */
  function handleCellClick(roomId: string, iso: string) {
    // Ignore if occupied
    const busy = reservations.some(r =>
      r.roomId === roomId &&
      !['cancelled', 'no_show'].includes(r.status) &&
      iso >= r.checkInDate &&
      iso < r.checkOutDate
    );
    if (!busy) setQuickCreate({ roomId, checkInDate: iso });
  }

  /* Range label */
  const startLabel = `${days[0].getDate()} ${MONTH_ABR[days[0].getMonth()]} ${days[0].getFullYear()}`;
  const endLabel   = `${days[DAYS-1].getDate()} ${MONTH_ABR[days[DAYS-1].getMonth()]} ${days[DAYS-1].getFullYear()}`;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate(-1)} className="press w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            className="press px-3 h-8 rounded-lg bg-surface border border-border text-xs font-medium text-[#ccc]"
          >
            Hoy
          </button>
          <button onClick={() => navigate(1)} className="press w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
            <ChevronRight size={14} />
          </button>
          <span className="text-sm text-white font-medium ml-2">
            {startLabel} — {endLabel}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          {(['confirmed','checked_in','pending'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: PALETTE[s].bar }} />
              <span className="text-xs text-muted">{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar board ─────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card" style={{ position: 'relative' }}>
        <div style={{ minWidth: LABEL_W + DAYS * CELL_W }}>

          {/* ── Date header ──────────────────────── */}
          <div className="flex border-b border-border" style={{ background: '#0f1520', position: 'sticky', top: 0, zIndex: 20 }}>
            {/* Room label header */}
            <div
              style={{ width: LABEL_W, minWidth: LABEL_W, position: 'sticky', left: 0, zIndex: 30, background: '#0f1520' }}
              className="flex-shrink-0 border-r border-border flex items-end px-3 pb-2 pt-3"
            >
              <span className="text-[10px] text-muted uppercase tracking-widest">Habitación</span>
            </div>

            {/* Day columns */}
            {days.map((d, i) => {
              const iso       = dayStrs[i];
              const isToday   = iso === todayStr;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const newMonth  = i === 0 || d.getDate() === 1;

              return (
                <div
                  key={iso}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`flex-shrink-0 flex flex-col items-center justify-end pb-1.5 pt-1 border-r border-border ${
                    isToday ? 'bg-[#0f766e18]' : isWeekend ? 'bg-[#ffffff03]' : ''
                  }`}
                >
                  {newMonth && (
                    <span className="text-[8px] font-bold text-primary uppercase tracking-wider leading-none mb-0.5">
                      {MONTH_ABR[d.getMonth()]}
                    </span>
                  )}
                  <span className={`text-[9px] uppercase leading-none ${isToday ? 'text-primary' : 'text-muted'}`}>
                    {DAY_ABBR[d.getDay()]}
                  </span>
                  <span className={`text-[13px] font-mono font-bold leading-snug ${
                    isToday ? 'text-primary' : 'text-[#ccc]'
                  }`}>
                    {d.getDate()}
                  </span>
                  {isToday && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* ── Room rows ────────────────────────── */}
          {rooms.length === 0 && (
            <div className="flex items-center justify-center text-muted text-sm py-16">
              No hay habitaciones. Creá una en la sección Habitaciones.
            </div>
          )}

          {rooms.map((room, rowIdx) => {
            const rt      = typeMap[room.roomTypeId];
            const roomRes = getRoomRes(room.id);
            const isEven  = rowIdx % 2 === 0;

            return (
              <div
                key={room.id}
                className="flex border-b border-border"
                style={{ height: ROW_H, background: isEven ? 'transparent' : 'rgba(255,255,255,0.012)' }}
              >
                {/* Sticky room label */}
                <div
                  style={{
                    width: LABEL_W, minWidth: LABEL_W, height: ROW_H,
                    position: 'sticky', left: 0, zIndex: 10,
                    background: isEven ? '#0d1623' : '#0e1826',
                  }}
                  className="flex-shrink-0 flex flex-col justify-center px-3 border-r border-border"
                >
                  <span className="text-sm font-mono font-bold text-white leading-tight">
                    {room.roomNumber}
                  </span>
                  {rt && (
                    <span className="text-[10px] text-muted leading-tight truncate">{rt.name}</span>
                  )}
                </div>

                {/* Scrollable cells + blocks */}
                <div className="relative flex flex-shrink-0" style={{ height: ROW_H }}>
                  {/* Background grid cells (clickable) */}
                  {dayStrs.map((iso, di) => {
                    const isToday   = iso === todayStr;
                    const isWeekend = days[di].getDay() === 0 || days[di].getDay() === 6;
                    const isPast    = iso < todayStr;

                    return (
                      <div
                        key={iso}
                        style={{
                          width: CELL_W, minWidth: CELL_W, height: ROW_H,
                          transition: 'background-color 100ms ease',
                        }}
                        className={`flex-shrink-0 border-r border-border cursor-pointer ${
                          isToday   ? 'bg-[#0f766e08]' : ''
                        } ${isWeekend ? 'bg-[#ffffff02]' : ''} ${
                          isPast ? '' : 'hover:bg-[#0f766e12]'
                        }`}
                        onClick={() => handleCellClick(room.id, iso)}
                      />
                    );
                  })}

                  {/* Reservation blocks */}
                  {roomRes.map((res) => {
                    const geom = blockGeom(res);
                    if (!geom) return null;
                    const g      = guestMap[res.guestId];
                    const pal    = PALETTE[res.status] ?? PALETTE.confirmed;
                    const br     = `${geom.roundLeft ? 5 : 0}px ${geom.roundRight ? 5 : 0}px ${geom.roundRight ? 5 : 0}px ${geom.roundLeft ? 5 : 0}px`;

                    return (
                      <div
                        key={res.id}
                        style={{
                          position: 'absolute',
                          top: 5,
                          bottom: 5,
                          left: geom.left,
                          width: geom.width,
                          background: pal.bar,
                          borderRadius: br,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 8,
                          paddingRight: 4,
                          gap: 5,
                          userSelect: 'none',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ res, guest: g, x: rect.left, y: rect.bottom + 6 });
                        }}
                      >
                        {/* Left accent line */}
                        {geom.roundLeft && (
                          <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                            background: 'rgba(255,255,255,0.25)', borderRadius: '5px 0 0 5px',
                          }} />
                        )}
                        <div style={{ overflow: 'hidden', flex: 1, marginLeft: geom.roundLeft ? 4 : 0 }}>
                          {g && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: pal.text,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              display: 'block', lineHeight: 1.3,
                            }}>
                              {g.firstName} {g.lastName[0]}.
                            </span>
                          )}
                          <span style={{
                            fontSize: 9, color: `${pal.text}aa`,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            display: 'block', lineHeight: 1.2,
                          }}>
                            {res.confirmationNumber}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* ── Reservation tooltip ─────────────────── */}
      {tooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />
          <div
            className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl p-4 w-64 animate-fade-up"
            style={{ top: Math.min(tooltip.y, window.innerHeight - 220), left: Math.min(tooltip.x, window.innerWidth - 280) }}
          >
            {/* Status badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: PALETTE[tooltip.res.status]?.bar ?? '#0f766e' }} />
                <span className="text-xs font-medium text-white">
                  {STATUS_LABEL[tooltip.res.status] ?? tooltip.res.status}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted">{tooltip.res.confirmationNumber}</span>
            </div>

            {tooltip.guest && (
              <p className="text-sm font-semibold text-white mb-1">
                {tooltip.guest.firstName} {tooltip.guest.lastName}
              </p>
            )}
            {tooltip.guest?.email && (
              <p className="text-xs text-muted mb-3">{tooltip.guest.email}</p>
            )}

            <div className="space-y-1 border-t border-border pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Check-in</span>
                <span className="text-[#ccc] font-mono">{tooltip.res.checkInDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Check-out</span>
                <span className="text-[#ccc] font-mono">{tooltip.res.checkOutDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Total</span>
                <span className="text-white font-mono font-medium">
                  ${Number(tooltip.res.totalAmount ?? tooltip.res.baseAmount).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <a
                href="/reservations"
                className="press flex-1 text-center text-xs bg-surface border border-border text-[#ccc] py-1.5 rounded-lg"
              >
                Ver reservas
              </a>
              <button
                onClick={() => setTooltip(null)}
                className="press text-xs bg-primary text-white px-3 py-1.5 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Quick create modal ─────────────────── */}
      {quickCreate && (
        <QuickReservationModal
          roomId={quickCreate.roomId}
          checkInDate={quickCreate.checkInDate}
          rooms={rooms}
          roomTypes={roomTypes}
          onClose={() => setQuickCreate(null)}
          onCreated={() => {
            setQuickCreate(null);
            swrMutate('/api/v1/reservations');
          }}
        />
      )}
    </div>
  );
}
