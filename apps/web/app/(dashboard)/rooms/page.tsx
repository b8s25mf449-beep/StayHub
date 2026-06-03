import RoomGrid from '@/components/rooms/RoomGrid';

export default function RoomsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Habitaciones</h2>
        <p className="text-xs text-muted">Click en una habitación para cambiar estado</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <RoomGrid />
      </div>
    </div>
  );
}
