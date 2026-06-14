'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

type View = 'login' | 'register' | 'forgot' | 'forgot-sent';

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

export default function LoginPage() {
  const { login } = useAuth();
  const [view, setView] = useState<View>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [hotelName, setHotelName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResetUrl, setForgotResetUrl] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch {
      setLoginError('Email o contraseña incorrectos');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/register', {
        hotelName, firstName, lastName,
        email: regEmail, password: regPassword,
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/';
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      setRegError(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear la cuenta'));
    } finally {
      setRegLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/forgot-password', { email: forgotEmail });
      if (data?.resetUrl) setForgotResetUrl(data.resetUrl);
      setView('forgot-sent');
    } catch {
      setForgotError('Error al procesar la solicitud');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 animate-fade-up delay-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            S
          </div>
          <h1 className="text-xl font-semibold">StayHub</h1>
          <p className="text-muted text-sm mt-1">Panel de gestión hotelera</p>
        </div>

        {/* LOGIN */}
        {view === 'login' && (
          <div className="animate-fade-up delay-75">
            <div className="flex bg-surface border border-border rounded-xl p-1 mb-4">
              <button
                onClick={() => setView('login')}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-primary text-white"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setView('register')}
                className="flex-1 py-2 text-sm font-medium text-muted hover:text-white transition-colors"
              >
                Crear cuenta
              </button>
            </div>

            <form onSubmit={handleLogin} className="bg-surface border border-border rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="admin@hotel.com"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted uppercase tracking-wider">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs text-primary hover:text-primary-light transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && <p className="text-[#f87171] text-xs">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="press w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loginLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>
        )}

        {/* REGISTER */}
        {view === 'register' && (
          <div className="animate-fade-up delay-75">
            <div className="flex bg-surface border border-border rounded-xl p-1 mb-4">
              <button
                onClick={() => setView('login')}
                className="flex-1 py-2 text-sm font-medium text-muted hover:text-white transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setView('register')}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-primary text-white"
              >
                Crear cuenta
              </button>
            </div>

            <form onSubmit={handleRegister} className="bg-surface border border-border rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-2">Nombre del hotel</label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="Hotel Travertino"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-2">Nombre</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-2">Apellido</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                    placeholder="García"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="admin@hotel.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-2">
                  Contraseña
                </label>
                <p className="text-xs text-muted mb-2">{PASSWORD_HINT}</p>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="••••••••"
                  required
                />
                <PasswordStrength password={regPassword} />
              </div>
              {regError && <p className="text-[#f87171] text-xs">{regError}</p>}
              <button
                type="submit"
                disabled={regLoading}
                className="press w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {view === 'forgot' && (
          <div className="animate-fade-up delay-75">
            <form onSubmit={handleForgot} className="bg-surface border border-border rounded-xl p-6 space-y-4">
              <div className="mb-2">
                <h2 className="text-base font-semibold">Recuperar contraseña</h2>
                <p className="text-muted text-sm mt-1">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-field w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted"
                  placeholder="admin@hotel.com"
                  required
                />
              </div>
              {forgotError && <p className="text-[#f87171] text-xs">{forgotError}</p>}
              <button
                type="submit"
                disabled={forgotLoading}
                className="press w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className="w-full text-sm text-muted hover:text-white transition-colors py-1"
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          </div>
        )}

        {/* FORGOT SENT */}
        {view === 'forgot-sent' && (
          <div className="animate-fade-up delay-75 bg-surface border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#0f766e]/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-[#0f766e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">Revisa tu email</h2>
              <p className="text-muted text-sm mt-1">
                Si la cuenta existe, recibirás un enlace para restablecer tu contraseña. Expira en 1 hora.
              </p>
            </div>
            {forgotResetUrl && (
              <div className="text-left bg-bg border border-border rounded-lg p-3">
                <p className="text-xs text-muted mb-2">
                  Email no configurado — usa este enlace directamente:
                </p>
                <a
                  href={forgotResetUrl}
                  className="text-xs text-primary break-all hover:underline"
                >
                  {forgotResetUrl}
                </a>
              </div>
            )}
            <button
              onClick={() => setView('login')}
              className="text-sm text-muted hover:text-white transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
