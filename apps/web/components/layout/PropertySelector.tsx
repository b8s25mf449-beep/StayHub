'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronRight, Plus } from 'lucide-react';
import { useProperty } from '@/lib/property-context';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter · máx. 1',
  professional: 'Pro · máx. 5',
  enterprise: 'Enterprise · ilimitadas',
};

export default function PropertySelector() {
  const { properties, activeProperty, switchProperty, canAddProperty, plan } = useProperty();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = activeProperty
    ? activeProperty.name.slice(0, 2).toUpperCase()
    : '—';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={activeProperty?.name ?? 'Sin propiedad'}
        className={`w-9 h-9 rounded-lg flex items-center justify-center press nav-hover text-xs font-bold
          ${activeProperty ? 'bg-[#0f766e22] text-primary' : 'bg-surface text-muted border border-border'}`}
      >
        {activeProperty ? label : <Building2 size={15} />}
      </button>

      {open && (
        <div className="absolute left-12 top-0 z-50 w-56 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted">Propiedad activa</p>
            <p className="text-xs text-white font-medium truncate mt-0.5">
              {activeProperty?.name ?? 'Ninguna'}
            </p>
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => { switchProperty(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#ffffff08] transition-colors text-left"
              >
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[#0f766e22] text-primary text-[10px] font-bold">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-white">{p.name}</span>
                {activeProperty?.id === p.id && <Check size={12} className="text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border p-1">
            {canAddProperty ? (
              <button
                onClick={() => { router.push('/settings/properties'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-[#0f766e11] rounded-lg transition-colors"
              >
                <Plus size={13} />
                Nueva propiedad
              </button>
            ) : (
              <div className="px-3 py-2">
                <p className="text-xs text-muted">{PLAN_LABELS[plan]}</p>
                <button
                  onClick={() => { router.push('/settings/properties'); setOpen(false); }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  Gestionar propiedades <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
