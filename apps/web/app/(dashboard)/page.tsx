import StatsGrid from '@/components/dashboard/StatsGrid';
import RevenueChart from '@/components/dashboard/RevenueChart';
import RecentReservations from '@/components/dashboard/RecentReservations';
import TodayActivity from '@/components/dashboard/TodayActivity';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>
      <StatsGrid />
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">
        <div className="col-span-2">
          <RevenueChart />
        </div>
      </div>
      <TodayActivity />
      <RecentReservations />
    </div>
  );
}
