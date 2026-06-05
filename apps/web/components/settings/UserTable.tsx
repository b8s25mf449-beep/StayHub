'use client';

import { useState } from 'react';
import { MoreHorizontal, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import type { UserWithRoles, RoleOption } from '@/types';

interface Props {
  users: UserWithRoles[];
  roles: RoleOption[];
  currentUserId: string;
  onMutate: () => void;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-[#0f766e22] text-primary border border-[#0f766e33]',
  usuario: 'bg-card text-muted border border-border',
  super_admin: 'bg-[#7c3aed22] text-[#a78bfa] border border-[#7c3aed33]',
};

export default function UserTable({ users, roles, currentUserId, onMutate }: Props) {
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleChangeRole(userId: string, roleId: string) {
    setLoadingId(userId);
    try {
      await api.patch(`/api/v1/users/${userId}/role`, { roleId });
      onMutate();
    } finally {
      setLoadingId(null);
      setChangingRoleFor(null);
    }
  }

  async function handleChangeStatus(userId: string, currentStatus: string) {
    setLoadingId(userId);
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/api/v1/users/${userId}/status`, { status: newStatus });
      onMutate();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    setLoadingId(userId);
    try {
      await api.delete(`/api/v1/users/${userId}`);
      onMutate();
    } finally {
      setLoadingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-sm">
        No hay usuarios todavía. Creá el primero con el botón de arriba.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Usuario</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Email</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Rol</th>
          <th className="text-left text-xs text-muted uppercase tracking-wider py-3 px-4 font-medium">Estado</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          const isSuspended = u.status === 'suspended';
          const roleName = u.roles[0]?.name ?? '—';
          const isChangingRole = changingRoleFor === u.id;
          const isLoading = loadingId === u.id;

          return (
            <tr
              key={u.id}
              className={`group border-b border-border transition-opacity ${
                isSuspended ? 'opacity-50' : ''
              }`}
            >
              {/* Name */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {u.firstName[0]?.toUpperCase()}
                  </div>
                  <span className="text-white font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                </div>
              </td>

              {/* Email */}
              <td className="py-3 px-4 text-muted">{u.email}</td>

              {/* Role */}
              <td className="py-3 px-4">
                {isChangingRole ? (
                  <div className="flex items-center gap-1">
                    <select
                      autoFocus
                      defaultValue={u.roles[0]?.id ?? ''}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      onBlur={() => setChangingRoleFor(null)}
                      disabled={isLoading}
                      className="bg-bg border border-border rounded-md px-2 py-1 text-xs text-white"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name === 'admin' ? 'Admin' : 'Usuario'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    ROLE_STYLES[roleName] ?? 'bg-card text-muted border border-border'
                  }`}>
                    {roleName === 'admin' ? 'Admin' : roleName === 'usuario' ? 'Usuario' : roleName}
                  </span>
                )}
              </td>

              {/* Status */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSuspended ? 'bg-[#fb923c]' : 'bg-emerald-500'
                  }`} />
                  <span className="text-muted text-xs capitalize">
                    {isSuspended ? 'Suspendido' : 'Activo'}
                  </span>
                </div>
              </td>

              {/* Actions */}
              <td className="py-3 px-4">
                {!isSelf && (
                  <div className="relative flex justify-end">
                    <button
                      className="press opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-white hover:bg-card transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        const menu = e.currentTarget.nextElementSibling as HTMLElement;
                        menu?.classList.toggle('hidden');
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    <div className="hidden absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[160px] animate-fade-up">
                      <button
                        onMouseDown={() => { setChangingRoleFor(u.id); }}
                        className="press w-full text-left px-3 py-2 text-xs text-white hover:bg-card flex items-center gap-2"
                      >
                        <ChevronDown size={12} />
                        Cambiar rol
                      </button>
                      <button
                        onMouseDown={() => handleChangeStatus(u.id, u.status)}
                        disabled={isLoading}
                        className="press w-full text-left px-3 py-2 text-xs text-white hover:bg-card"
                      >
                        {isSuspended ? 'Reactivar' : 'Suspender'}
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onMouseDown={() => handleDelete(u.id)}
                        disabled={isLoading}
                        className="press w-full text-left px-3 py-2 text-xs text-[#f87171] hover:bg-card"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
