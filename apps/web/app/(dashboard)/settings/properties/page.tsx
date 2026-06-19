'use client';

import { useState } from 'react';
import { Building2, Edit2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useProperty } from '@/lib/property-context';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import PropertyModal from '@/components/properties/PropertyModal';
import type { Property } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel', hostel: 'Hostel', boutique: 'Boutique',
  apartment: 'Apartamento', vacation_rental: 'Vacation Rental',
};

const PLAN_LIMITS: Record<string, number> = {
  starter: 1, professional: 5, enterprise: Infinity,
};

export default function PropertiesPage() {
  const { properties, activeProperty, switchProperty, refetch, plan, canAddProperty } = useProperty();
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const isAdmin = user?.roles?.some((r) => r === 'admin' || r === 'super_admin') ?? false;

  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/properties/${id}`);
      if (activeProperty?.id === id) {
        const remaining = properties.filter((p) => p.id !== id);
        if (remaining.length > 0) switchProperty(remaining[0].id);
      }
      refetch();
    } catch {
      alert('Error al eliminar la propiedad');
    } finally {
      setDeletingId(null);
    }
  }

  const maxProperties = PLAN_LIMITS[plan] ?? 1;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <div>
          <h2 className="text-lg font-semibold">Propiedades</h2>
          <p className="text-xs text-muted mt-0.5">
            {properties.length} de {maxProperties === Infinity ? '∞' : maxProperties} ·{' '}
            Plan <span className="capitalize">{plan}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingProperty(undefined); setShowModal(true); }}
            disabled={!canAddProperty}
            title={!canAddProperty ? `Tu plan ${plan} no permite más propiedades` : undefined}
            className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Nueva propiedad
          </button>
        )}
      </div>

      {!canAddProperty && (
        <div className="flex items-start gap-3 bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl p-4 mb-6 animate-fade-up delay-50">
          <AlertTriangle size={16} className="text-[#f97316] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#f97316]">
            Has alcanzado el límite de tu plan <span className="capitalize font-medium">{plan}</span>.
            Contacta al administrador para cambiar de plan y añadir más propiedades.
          </p>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center animate-fade-up delay-50">
          <Building2 size={32} className="text-muted mx-auto mb-3" />
          <h3 className="font-medium mb-1">Sin propiedades</h3>
          <p className="text-sm text-muted mb-4">
            Crea tu primera propiedad para empezar a gestionar habitaciones y reservas.
          </p>
          {isAdmin && (
            <button
              onClick={() => { setEditingProperty(undefined); setShowModal(true); }}
              className="press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Crear primera propiedad
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up delay-75">
          {properties.map((p) => (
            <div
              key={p.id}
              className={`bg-surface border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                activeProperty?.id === p.id ? 'border-primary/50' : 'border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-[#0f766e22] flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{p.name}</p>
                  {activeProperty?.id === p.id && (
                    <span className="text-[10px] bg-[#0f766e22] text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      Activa
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {TYPE_LABELS[p.type] ?? p.type}
                  {p.city ? ` · ${p.city}` : ''}
                  {p.country ? `, ${p.country}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {activeProperty?.id !== p.id && (
                  <button
                    onClick={() => switchProperty(p.id)}
                    className="text-xs text-primary hover:underline px-2 py-1 press"
                  >
                    Activar
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setEditingProperty(p); setShowModal(true); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-[#ffffff08] press"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-[#f87171] hover:bg-[#f87171]/10 press disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PropertyModal
          property={editingProperty}
          onClose={() => setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
