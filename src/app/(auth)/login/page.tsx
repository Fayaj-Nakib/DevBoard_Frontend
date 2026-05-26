'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function apiError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Something went wrong.';
  const e = err as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  };

  if (!e.response) {
    return 'Cannot reach the server. Check your connection or try again shortly.';
  }

  const { data } = e.response;

  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }

  return data?.message ?? 'Login failed.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (requires2fa) {
      // Second step: submit credentials + TOTP code
      try {
        const { data } = await api.post<{ user: { id: string; name: string; email: string }; token: string }>(
          '/auth/two-factor-challenge',
          { email, password, code: totpCode },
        );
        localStorage.setItem('token', data.token);
        window.location.href = '/workspaces';
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // First step: credentials only
      const { data } = await api.post<{ requires_2fa?: boolean; user?: object; token?: string }>(
        '/auth/login',
        { email, password },
      );

      if (data.requires_2fa) {
        setRequires2fa(true);
      } else {
        // No 2FA — login succeeded normally via AuthContext
        await login(email, password);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Sign in to DevBoard</h1>
        <p className="text-sm text-gray-500 mb-6">
          {requires2fa ? 'Enter your authenticator code to continue.' : 'Project management for developers'}
        </p>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requires2fa ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Authenticator Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center text-lg"
                placeholder="000000"
                autoFocus
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">Open your authenticator app and enter the 6-digit code.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (requires2fa && totpCode.length !== 6)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? (requires2fa ? 'Verifying…' : 'Signing in...') : (requires2fa ? 'Verify Code' : 'Sign in')}
          </button>

          {requires2fa && (
            <button
              type="button"
              onClick={() => { setRequires2fa(false); setTotpCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              ← Back to login
            </button>
          )}
        </form>

        {!requires2fa && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            No account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">Register</a>
          </p>
        )}
      </div>
    </div>
  );
}
