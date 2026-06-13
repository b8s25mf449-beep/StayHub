import StatsGrid from '@/components/dashboard/StatsGrid';
import RevenueChart from '@/components/dashboard/RevenueChart';
import RecentReservations from '@/components/dashboard/RecentReservations';
import TodayActivity from '@/components/dashboard/TodayActivity';

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>
      <StatsGrid />
      <div className="mb-3.5">
        <RevenueChart />
      </div>
      <TodayActivity />
      <RecentReservations />
    </div>
  );
}
