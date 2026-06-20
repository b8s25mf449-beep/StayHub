'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.roles?.some((r) => r === 'admin' || r === 'super_admin') ?? false;

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace('/');
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !isAdmin) return null;

  return <>{children}</>;
}
