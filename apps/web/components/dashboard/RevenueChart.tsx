'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { Reservation } from '@/types';

export default function RevenueChart() {
  const { data: reservations = [] } = useSWR<Reservation[]>('/api/v1/reservations', fetcher);

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().split('T')[0];
  });

  const byDay = days.map((day) => ({
    day,
    revenue: reservations
      .filter((r) => r.checkInDate === day && ['confirmed', 'checked_in', 'checked_out'].includes(r.status))
      .reduce((s, r) => s + Number(r.baseAmount), 0),
  }));

  const max = Math.max(...byDay.map((d) => d.revenue), 1);
  const W = 600;
  const H = 80;
  const points = byDay
    .map((d, i) => `${(i / (days.length - 1)) * W},${H - (d.revenue / max) * H}`)
    .join(' ');

  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-fade-up delay-100">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Ingresos últimos 30 días</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${points} ${W},${H}`} fill="url(#g)" />
        <polyline points={points} fill="none" stroke="#0f766e" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
