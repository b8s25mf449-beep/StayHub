'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            S
          </div>
          <h1 className="text-xl font-semibold">StayHub</h1>
          <p className="text-muted text-sm mt-1">Acceso al panel de gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-primary transition-colors"
              placeholder="admin@hotel.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-[#f87171] text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-[#0d6962] text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
