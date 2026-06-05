'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import type { RoleOption } from '@/types';

interface Props {
  roles: RoleOption[];
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
};

export default function NewUserDrawer({ roles, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ ...EMPTY, roleId: roles[0]?.id ?? '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'email') setEmailError('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roleId) { setError('Seleccioná un rol'); return; }
    setSubmitting(true);
    setError('');
    setEmailError('');

    try {
      await api.post('/api/v1/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleIds: [form.roleId],
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message ?? 'Error al crear usuario';
      if (msg.toLowerCase().includes('email')) {
        setEmailError('Este email ya está registrado');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-sm bg-surface border-l border-border h-full flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Nuevo usuario</h2>
            <p className="text-xs text-muted mt-0.5">Completá los datos del colaborador</p>
          </div>
          <button onClick={onClose} className="press text-muted p-1 rounded-lg nav-hover">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                Nombre <span className="text-[#f87171]">*</span>
              </label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
                placeholder="María"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                Apellido <span className="text-[#f87171]">*</span>
              </label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
                placeholder="García"
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Email <span className="text-[#f87171]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              placeholder="maria@hotel.com"
              className={`input-field w-full bg-bg border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted ${
                emailError ? 'border-[#f87171]' : 'border-border'
              }`}
            />
            {emailError && (
              <p className="text-xs text-[#f87171] mt-1">{emailError}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Contraseña temporal <span className="text-[#f87171]">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Rol <span className="text-[#f87171]">*</span>
            </label>
            <select
              value={form.roleId}
              onChange={(e) => set('roleId', e.target.value)}
              required
              className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white"
            >
              <option value="" disabled>Seleccionar rol...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name === 'admin' ? 'Admin — Gerente de propiedad' : 'Usuario — Recepcionista'}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-[#f87171] animate-fade-in">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="press flex-1 bg-surface border border-border text-[#ccc] text-sm py-2.5 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.firstName || !form.lastName || !form.email || !form.password || !form.roleId}
            className="press flex-1 bg-primary text-white text-sm py-2.5 rounded-lg font-medium disabled:opacity-40"
          >
            {submitting ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
