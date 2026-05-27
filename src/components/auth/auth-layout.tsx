'use client';

import { LayoutGrid } from 'lucide-react';
import { initials } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT PANEL (desktop only) ─────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[45%] bg-primary flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative glow blobs */}
        <div className="absolute -top-16 -right-16 w-[320px] h-[320px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-16 w-[220px] h-[220px] rounded-full bg-white/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xl text-white tracking-tight">DevBoard</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Ship faster.<br />Stay aligned.
          </h2>
          <p className="text-white/70 text-base mt-3 leading-relaxed">
            Tasks, sprints, and timelines built for developer teams.
          </p>
        </div>

        {/* Testimonial */}
        <div className="bg-white rounded-xl p-4 shadow-lg relative z-10">
          <p className="text-sm text-foreground leading-relaxed">
            &ldquo;DevBoard replaced Jira for our 12-person team. We ship 30% faster.&rdquo;
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center text-[11px] font-semibold text-primary-subtle-foreground flex-shrink-0">
              {initials('Arif Rahman')}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Arif Rahman</p>
              <p className="text-xs text-foreground-secondary">CTO, Stackhive</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 py-8 bg-background">
        <div className="w-full max-w-[380px] animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
