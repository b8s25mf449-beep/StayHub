export function formatPrice(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('es-AR', opts)} - ${end.toLocaleDateString('es-AR', { ...opts, year: 'numeric' })}`;
}

export function calcNights(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const msPerDay = 86400000;
  return Math.max(
    0,
    Math.round(
      (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / msPerDay
    )
  );
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Consulta',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
  no_show: 'No show',
};

export const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-[#1a2535] text-[#4a5a6c]',
  pending: 'bg-[#d9770622] text-[#fb923c]',
  confirmed: 'bg-[#0f766e22] text-[#0f766e]',
  checked_in: 'bg-[#0369a122] text-[#38bdf8]',
  checked_out: 'bg-[#1a2535] text-[#4a5a6c]',
  cancelled: 'bg-[#dc262622] text-[#f87171]',
  no_show: 'bg-[#dc262622] text-[#f87171]',
};

export const ROOM_STATUS_COLORS: Record<string, string> = {
  available: 'bg-[#0f766e15] border border-[#0f766e44] text-[#0f766e]',
  occupied: 'bg-[#0369a115] border border-[#0369a144] text-[#38bdf8]',
  cleaning: 'bg-[#d9770615] border border-[#d9770644] text-[#fb923c]',
  maintenance: 'bg-[#dc262615] border border-[#dc262644] text-[#f87171]',
  out_of_order: 'bg-[#dc262615] border border-[#dc262644] text-[#f87171]',
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  out_of_order: 'Fuera de servicio',
};

export const CHANNEL_LABELS: Record<string, string> = {
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  ical: 'iCal',
  vrbo: 'VRBO',
};
