import PmsCalendar from '@/components/calendar/PmsCalendar';

export default function CalendarPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold">Tablón de reservas</h2>
        <p className="text-xs text-muted mt-1">
          Vista: clic en celda vacía para crear · clic en bloque para detalles. Mover: arrastrá para ajustar fechas.
        </p>
      </div>
      <div className="animate-fade-up delay-50">
        <PmsCalendar />
      </div>
    </div>
  );
}
