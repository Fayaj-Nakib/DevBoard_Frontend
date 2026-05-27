'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, Lock, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

/* ─── Password strength ─────────────────────────────────────────────────── */
function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_CONFIG = [
  { label: 'Weak',   colorCls: 'bg-destructive' },
  { label: 'Fair',   colorCls: 'bg-warning' },
  { label: 'Good',   colorCls: 'bg-warning' },
  { label: 'Strong', colorCls: 'bg-success' },
] as const;

function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  const cfg = STRENGTH_CONFIG[score - 1];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-1 rounded-full transition-colors duration-200',
              i < score ? cfg.colorCls : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs',
        score === 4 ? 'text-success'
          : score >= 2 ? 'text-warning'
          : 'text-destructive',
      )}>
        {cfg?.label}
      </p>
    </div>
  );
}

/* ─── Schema ─────────────────────────────────────────────────────────────── */
const schema = z.object({
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type FormValues = z.infer<typeof schema>;

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
  return data?.message ?? 'Failed to reset password.';
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmValue  = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const passwordsMatch = passwordValue && confirmValue && passwordValue === confirmValue;

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password:              values.password,
        password_confirmation: values.confirmPassword,
      });
      toast.success('Password updated', {
        description: 'Please sign in with your new password.',
      });
      router.push('/login');
    } catch (err) {
      toast.error('Reset failed', { description: apiError(err) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px] animate-fade-in">

        {/* Back */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-foreground-tertiary hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="space-y-6">
          <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-primary" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mt-4">Set new password</h1>
            <p className="text-sm text-foreground-tertiary mt-2">
              Choose a strong password for your account.
            </p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(); }}
            className="space-y-4"
          >
            {/* New password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                New password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  {...register('password')}
                  className={cn('pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={passwordValue} />
              {errors.password && (
                <p className="text-sm text-destructive animate-slide-up">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={cn(
                    'pr-10',
                    errors.confirmPassword && 'border-destructive focus-visible:ring-destructive',
                    passwordsMatch && 'border-success focus-visible:ring-success',
                  )}
                />
                {passwordsMatch ? (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success pointer-events-none" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive animate-slide-up">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</>
                : 'Reset password'
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
