'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import type { Property } from '@/types';

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
];

interface Props {
  property?: Property;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
}

export default function PropertyModal({ property, onClose, onSaved }: Props) {
  const isEdit = !!property;
  const [form, setForm] = useState<FormState>({
    name: '', type: 'hotel', address: '', city: '',
    country: '', phone: '', email: '',
    checkInTime: '', checkOutTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (property) {
      const p = property as Property & Record<string, unknown>;
      setForm({
        name: property.name ?? '',
        type: property.type ?? 'hotel',
        address: (p.address as string) ?? '',
        city: property.city ?? '',
        country: property.country ?? '',
        phone: (p.phone as string) ?? '',
        email: (p.email as string) ?? '',
        checkInTime: (p.checkInTime as string) ?? '',
        checkOutTime: (p.checkOutTime as string) ?? '',
      });
    }
  }, [property]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        ...(form.address && { address: form.address }),
        ...(form.city && { city: form.city }),
        ...(form.country && { country: form.country }),
        ...(form.phone && { phone: form.phone }),
        ...(form.email && { email: form.email }),
        ...(form.checkInTime && { checkInTime: form.checkInTime }),
        ...(form.checkOutTime && { checkOutTime: form.checkOutTime }),
      };
      if (isEdit) {
        await api.put(`/api/v1/properties/${property!.id}`, payload);
      } else {
        await api.post('/api/v1/properties', payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'input-field w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted';
  const labelClass = 'text-xs text-muted uppercase tracking-wider block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white press">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Hotel Travertino"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Tipo *</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Check-in</label>
              <input
                type="time"
                className={inputClass}
                value={form.checkInTime}
                onChange={(e) => set('checkInTime', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Check-out</label>
              <input
                type="time"
                className={inputClass}
                value={form.checkOutTime}
                onChange={(e) => set('checkOutTime', e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Contacto y ubicación</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Calle 123" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ciudad" />
                </div>
                <div>
                  <label className={labelClass}>País</label>
                  <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="México" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+52 55 0000 0000" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@hotel.com" />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-[#f87171] text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium press disabled:opacity-50"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear propiedad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
