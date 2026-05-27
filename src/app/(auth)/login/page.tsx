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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

/* ─── Zod schemas ────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.email(),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
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
    defaultValues: { email: '', password: '', remember: false },
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

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" {...register('remember')} />
              <label htmlFor="remember" className="text-sm text-foreground-secondary cursor-pointer select-none">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
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

        {/* Divider */}
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-foreground-muted">
            or
          </span>
        </div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="hover:scale-[1.01] transition-transform"
            onClick={() => toast.info('Google sign-in coming soon')}
          >
            {/* Google SVG */}
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="hover:scale-[1.01] transition-transform"
            onClick={() => toast.info('GitHub sign-in coming soon')}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
