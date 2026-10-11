'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ShieldCheck, ChevronLeft } from 'lucide-react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

/* ─── Zod schemas ────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.email(),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

/* ─── API error helper ───────────────────────────────────────────────────── */
function apiError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Something went wrong.';
  const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  if (!e.response) return 'Cannot reach the server. Check your connection.';
  const { data } = e.response;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  return data?.message ?? 'Login failed.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  // Stash credentials for the 2FA second step
  const [stashedEmail, setStashedEmail] = useState('');
  const [stashedPassword, setStashedPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  /* ── Step 1: email + password ─────────────────────────────────────────── */
  const onCredentialsSubmit = async (values: LoginForm) => {
    try {
      const { data } = await api.post<{ requires_2fa?: boolean }>('/auth/login', {
        email:    values.email,
        password: values.password,
      });

      if (data.requires_2fa) {
        setStashedEmail(values.email);
        setStashedPassword(values.password);
        setStep('totp');
      } else {
        await login(values.email, values.password);
      }
    } catch (err) {
      toast.error('Sign in failed', { description: apiError(err) });
    }
  };

  /* ── Step 2: TOTP code ────────────────────────────────────────────────── */
  const onTotpSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setTotpLoading(true);
    try {
      const { data } = await api.post<{ token: string }>('/auth/two-factor-challenge', {
        email:    stashedEmail,
        password: stashedPassword,
        code:     totpCode,
      });
      localStorage.setItem('token', data.token);
      window.location.href = '/workspaces';
    } catch (err) {
      toast.error('Verification failed', { description: apiError(err) });
    } finally {
      setTotpLoading(false);
    }
  };

  /* ── TOTP step UI ─────────────────────────────────────────────────────── */
  if (step === 'totp') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => { setStep('credentials'); setTotpCode(''); }}
            className="flex items-center gap-1 text-sm text-foreground-tertiary hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">Two-factor auth</h1>
            <p className="text-sm text-foreground-tertiary mt-2">
              Open your authenticator app and enter the 6-digit code.
            </p>
          </div>

          <form onSubmit={onTotpSubmit} className="space-y-4">
            <Input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-xl font-mono tracking-[0.4em] h-12"
            />

            <Button
              type="submit"
              className="w-full"
              disabled={totpCode.length !== 6 || totpLoading}
            >
              {totpLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {totpLoading ? 'Verifying…' : 'Verify Code'}
            </Button>
          </form>
        </div>
      </AuthLayout>
    );
  }

  /* ── Credentials step UI ──────────────────────────────────────────────── */
  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-foreground-tertiary">Welcome back</p>
          <h1 className="text-2xl font-semibold text-foreground mt-1">Sign in to DevBoard</h1>
          <p className="text-sm text-foreground-tertiary mt-1.5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onCredentialsSubmit)(); }} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
              className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
            />
            {errors.email && (
              <p className="text-sm text-destructive animate-slide-up">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                className={cn('pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive animate-slide-up">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full hover:scale-[1.01] transition-transform"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
              : 'Sign in'
            }
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
