import RoomCalendar from '@/components/calendar/RoomCalendar';

export default function CalendarPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Calendario</h2>
        <p className="text-xs text-muted">Próximos 14 días</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <RoomCalendar />
      </div>
    </div>
  );
}
