import Link from 'next/link';
import ReservationTable from '@/components/reservations/ReservationTable';

export default function ReservationsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-lg font-semibold shrink-0">Reservas</h2>
        <Link
          href="/reservations/new"
          className="press bg-primary hover:bg-[#0d6962] text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          + Nueva reserva
        </Link>
      </div>
      <ReservationTable />
    </div>
  );
}
