import PmsCalendar from '@/components/calendar/PmsCalendar';

export default function CalendarPage() {
  return (
    <div className="p-6">
      <div className="mb-6 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold">Tablón de reservas</h2>
        <p className="text-xs text-muted mt-1">
          Hacé clic en una celda vacía para crear una reserva · Clic en un bloque para ver detalles
        </p>
      </div>
      <div className="animate-fade-up delay-50">
        <PmsCalendar />
      </div>
    </div>
  );
}
