'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

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
      <p className={cn('text-xs', score === 4 ? 'text-success' : score >= 3 ? 'text-warning' : score >= 2 ? 'text-warning' : 'text-destructive')}>
        {cfg?.label}
      </p>
    </div>
  );
}

/* ─── Zod schema ─────────────────────────────────────────────────────────── */
const registerSchema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters'),
  email:           z.email(),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  terms:           z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

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
  return data?.message ?? 'Registration failed.';
}

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', terms: false },
  });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmValue  = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const passwordsMatch = passwordValue && confirmValue && passwordValue === confirmValue;

  const onSubmit = async (values: RegisterForm) => {
    try {
      await authRegister(values.name, values.email, values.password);
    } catch (err) {
      toast.error('Registration failed', { description: apiError(err) });
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="text-sm text-foreground-tertiary mt-1.5">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(); }} className="space-y-4">
          {/* Full name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">Full name</label>
            <Input
              id="name"
              placeholder="Fayaj Nakib"
              autoComplete="name"
              {...register('name')}
              className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
            />
            {errors.name && (
              <p className="text-sm text-destructive animate-slide-up">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
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

          {/* Password + strength bar */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                autoComplete="new-password"
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

          {/* Terms */}
          <div className="flex items-start gap-2 pt-1">
            <Checkbox id="terms" {...register('terms')} className="mt-0.5" />
            <label htmlFor="terms" className="text-sm text-foreground-secondary leading-relaxed cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </label>
          </div>
          {errors.terms && (
            <p className="text-sm text-destructive animate-slide-up -mt-2">{errors.terms.message}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full hover:scale-[1.01] transition-transform"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
              : 'Create account'
            }
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
