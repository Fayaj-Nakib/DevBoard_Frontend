'use client';

import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Fills the login form with the public demo credentials. Only passed on the login page. */
  onFillDemo?: () => void;
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

export function AuthLayout({ children, onFillDemo }: AuthLayoutProps) {
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

        {/* About / demo panel */}
        <div className="bg-white rounded-xl p-4 shadow-lg relative z-10 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Portfolio project by Md Fayaj Nakib
            </p>
            <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
              Laravel API · Next.js · PostgreSQL · real-time with Pusher
            </p>
          </div>

          {onFillDemo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={onFillDemo}
            >
              Try the demo: demo@devboard.app / demo1234
            </Button>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <a
              href="https://github.com/Fayaj-Nakib/DevBoard_backend"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              Backend repo
            </a>
            <a
              href="https://github.com/Fayaj-Nakib/DevBoard_Frontend"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              Frontend repo
            </a>
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
