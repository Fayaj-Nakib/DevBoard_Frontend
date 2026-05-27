import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns Tailwind classes for a task status badge */
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    todo:        'text-foreground-tertiary bg-muted',
    in_progress: 'text-primary-subtle-foreground bg-primary-subtle',
    in_review:   'text-warning bg-warning-subtle',
    done:        'text-success bg-success-subtle',
    cancelled:   'text-destructive bg-destructive-subtle',
    blocked:     'text-warning bg-warning-subtle',
  };
  return map[status] ?? 'text-foreground-tertiary bg-muted';
}

/** Returns Tailwind text class for a priority level */
export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'text-destructive',
    high:   'text-warning',
    medium: 'text-primary',
    low:    'text-foreground-muted',
  };
  return map[priority] ?? 'text-foreground-muted';
}

/** Human-readable relative time (e.g. "3h ago", "5d ago") */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** True when dueDate is non-null and in the past */
export function isOverdue(dueDate: string | Date | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/** Deterministic avatar colour from a user id or name */
const AVATAR_PALETTE = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const;

export function avatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Short display name (first + last initial) */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
