import Link from 'next/link';
import ReservationTable from '@/components/reservations/ReservationTable';

export default function ReservationsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Reservas</h2>
        <Link
          href="/reservations/new"
          className="bg-primary hover:bg-[#0d6962] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva reserva
        </Link>
      </div>
      <ReservationTable />
    </div>
  );
}
