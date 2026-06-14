'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

const PASSWORD_HINT = 'Mín. 8 caracteres, mayúscula, número y símbolo';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte'];
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < score ? colors[score - 1] : '#2a2a2a' }}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="text-xs" style={{ color: colors[score - 1] }}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Enlace inválido o expirado.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Token inválido o expirado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            S
          </div>
          <h1 className="text-xl font-semibold">StayHub</h1>
        </div>

        {done ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#0f766e]/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-[#0f766e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">Contraseña actualizada</h2>
              <p className="text-muted text-sm mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="press w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium"
            >
              Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="mb-2">
              <h2 className="text-base font-semibold">Nueva contraseña</h2>
              <p className="text-muted text-sm mt-1">{PASSWORD_HINT}</p>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                placeholder="••••••••"
                required
                disabled={!token}
              />
              <PasswordStrength password={password} />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                placeholder="••••••••"
                required
                disabled={!token}
              />
              {confirm && password !== confirm && (
                <p className="text-[#f97316] text-xs mt-1">Las contraseñas no coinciden</p>
              )}
            </div>
            {error && <p className="text-[#f87171] text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="press w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full text-sm text-muted hover:text-white transition-colors py-1"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
