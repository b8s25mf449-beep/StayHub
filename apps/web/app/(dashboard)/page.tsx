'use client';

import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import StatsGrid from '@/components/dashboard/StatsGrid';
import RevenueChart from '@/components/dashboard/RevenueChart';
import RecentReservations from '@/components/dashboard/RecentReservations';
import TodayActivity from '@/components/dashboard/TodayActivity';
import { useProperty } from '@/lib/property-context';

export default function DashboardPage() {
  const { properties, loading } = useProperty();
  const router = useRouter();

  if (!loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="max-w-sm w-full text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-[#0f766e22] flex items-center justify-center mx-auto mb-5">
            <Building2 size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Bienvenido a StayHub</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Para empezar, creá tu primera propiedad. Desde ahí podrás gestionar habitaciones, reservas y canales.
          </p>
          <button
            onClick={() => router.push('/settings/properties')}
            className="press inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium"
          >
            Crear mi propiedad
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

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
