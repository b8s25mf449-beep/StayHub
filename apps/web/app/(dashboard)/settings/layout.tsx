'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !user.roles?.includes('super_admin')) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user?.roles?.includes('super_admin')) return null;

  return <>{children}</>;
}
