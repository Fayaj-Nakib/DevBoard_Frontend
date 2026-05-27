'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const schema = z.object({ email: z.email() });
type FormValues = z.infer<typeof schema>;

function apiError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Something went wrong.';
  const e = err as { response?: { data?: { message?: string } } };
  if (!e.response) return 'Cannot reach the server. Check your connection.';
  return e.response.data?.message ?? 'Failed to send reset link.';
}

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSentEmail(values.email);
      setSent(true);
      startCooldown();
    } catch (err) {
      toast.error('Failed to send link', { description: apiError(err) });
    }
  };

  const startCooldown = () => {
    setCooldown(60);
    const id = setInterval(() => {
      setCooldown((v) => {
        if (v <= 1) { clearInterval(id); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/forgot-password', { email: sentEmail });
      toast.success('Link resent', { description: `Another email was sent to ${sentEmail}` });
      startCooldown();
    } catch (err) {
      toast.error('Failed to resend', { description: apiError(err) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px] animate-fade-in">

        {/* Back button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-foreground-tertiary hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        {!sent ? (
          /* ── Request form ─────────────────────────────────────────────── */
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-primary" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-semibold text-foreground mt-4">Forgot your password?</h1>
              <p className="text-sm text-foreground-tertiary mt-2 leading-relaxed">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive animate-slide-up">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                  : 'Send reset link'
                }
              </Button>
            </form>
          </div>
        ) : (
          /* ── Success state ────────────────────────────────────────────── */
          <div className="space-y-6 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-success-subtle flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground mt-4">Check your email</h1>
              <p className="text-sm text-foreground-tertiary mt-2 leading-relaxed">
                We sent a reset link to{' '}
                <span className="font-medium text-foreground">{sentEmail}</span>
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={cooldown > 0}
              onClick={handleResend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
            </Button>

            <p className="text-xs text-foreground-muted">
              Wrong address?{' '}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
