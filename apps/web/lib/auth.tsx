'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import type { JwtPayload, AuthTokens } from '@/types';

interface AuthContextValue {
  user: JwtPayload | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = decodeJwt(token);
        if (payload.exp * 1000 > Date.now()) {
          setUser(payload);
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthTokens>('/api/v1/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(decodeJwt(data.accessToken));
    router.push('/');
  }

  function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/api/v1/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
