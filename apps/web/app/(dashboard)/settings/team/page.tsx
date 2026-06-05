'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Plus, Users } from 'lucide-react';
import UserTable from '@/components/settings/UserTable';
import NewUserDrawer from '@/components/settings/NewUserDrawer';
import type { UserWithRoles, RoleOption } from '@/types';

export default function TeamPage() {
  const { user } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);

  const { data: users = [], mutate: mutateUsers } = useSWR<UserWithRoles[]>(
    '/api/v1/users',
    fetcher,
  );

  const { data: roles = [] } = useSWR<RoleOption[]>(
    '/api/v1/roles',
    fetcher,
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up delay-0">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-muted" />
            <h2 className="text-lg font-semibold">Equipo</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Gestión de usuarios y roles del hotel
          </p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={14} />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-up delay-50">
        <UserTable
          users={users}
          roles={roles}
          currentUserId={user?.sub ?? ''}
          onMutate={() => mutateUsers()}
        />
      </div>

      {/* Drawer */}
      {showDrawer && (
        <NewUserDrawer
          roles={roles}
          onClose={() => setShowDrawer(false)}
          onCreated={() => mutateUsers()}
        />
      )}
    </div>
  );
}
