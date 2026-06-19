'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import api from './api';
import { useAuth } from './auth';
import type { Property } from '@/types';

const PLAN_LIMITS: Record<string, number> = {
  starter: 1,
  professional: 5,
  enterprise: Infinity,
};

interface PropertyContextValue {
  properties: Property[];
  activeProperty: Property | null;
  loading: boolean;
  plan: string;
  canAddProperty: boolean;
  switchProperty: (id: string) => void;
  refetch: () => void;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState('starter');

  const fetchProperties = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [propsRes, tenantRes] = await Promise.all([
        api.get<Property[]>('/api/v1/properties'),
        api.get(`/api/v1/tenants/${user.tenantId}`),
      ]);
      const props = propsRes.data;
      setProperties(props);
      setPlan(tenantRes.data.plan ?? 'starter');

      const savedId = localStorage.getItem('activePropertyId');
      const saved = props.find((p) => p.id === savedId);
      setActiveProperty(saved ?? props[0] ?? null);
    } catch {
      // ignore — user sees empty state
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  function switchProperty(id: string) {
    const prop = properties.find((p) => p.id === id);
    if (!prop) return;
    setActiveProperty(prop);
    localStorage.setItem('activePropertyId', id);
  }

  const maxProperties = PLAN_LIMITS[plan] ?? 1;
  const canAddProperty = properties.length < maxProperties;

  return (
    <PropertyContext.Provider value={{
      properties, activeProperty, loading, plan,
      canAddProperty, switchProperty, refetch: fetchProperties,
    }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used inside PropertyProvider');
  return ctx;
}
