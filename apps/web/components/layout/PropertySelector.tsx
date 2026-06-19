'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function openMenu() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 8 });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const label = activeProperty
    ? activeProperty.name.slice(0, 2).toUpperCase()
    : '—';

  const menu = open ? (
    <div
      ref={menuRef}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[9999] w-56 bg-[#0f1520] border border-[#1e2d3d] rounded-xl shadow-2xl overflow-hidden animate-fade-in"
    >
      <div className="px-3 py-2 border-b border-[#1e2d3d]">
        <p className="text-xs text-muted">Propiedad activa</p>
        <p className="text-xs text-white font-medium truncate mt-0.5">
          {activeProperty?.name ?? 'Ninguna'}
        </p>
      </div>

      <div className="py-1 max-h-48 overflow-y-auto">
        {properties.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted">Sin propiedades</p>
        ) : (
          properties.map((p) => (
            <button
              key={p.id}
              onClick={() => { switchProperty(p.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[#0f766e22] text-primary text-[10px] font-bold">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-white">{p.name}</span>
              {activeProperty?.id === p.id && <Check size={12} className="text-primary flex-shrink-0" />}
            </button>
          ))
        )}
      </div>

      <div className="border-t border-[#1e2d3d] p-1">
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
  ) : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={openMenu}
        title={activeProperty?.name ?? 'Sin propiedad'}
        className={`w-9 h-9 rounded-lg flex items-center justify-center press nav-hover text-xs font-bold
          ${activeProperty ? 'bg-[#0f766e22] text-primary' : 'bg-surface text-muted border border-border'}`}
      >
        {activeProperty ? label : <Building2 size={15} />}
      </button>

      {typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
  );
}
