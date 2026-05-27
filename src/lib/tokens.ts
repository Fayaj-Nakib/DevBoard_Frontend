/**
 * DevBoard design tokens — shared constants that must stay in sync with globals.css.
 * Use these in components that need JS-accessible color values (SVG fills, charts, etc.)
 */

export const COLORS = {
  /* Brand */
  primary: '#0C66E4',
  primaryLight: '#EFF5FF',

  /* Status */
  status: {
    todo:       '#64748B',
    in_progress: '#0C66E4',
    in_review:  '#7C3AED',
    done:       '#16A34A',
  },

  /* Priority */
  priority: {
    high:   '#DC2626',
    medium: '#D97706',
    low:    '#16A34A',
  },

  /* Surface (light mode) */
  surface: {
    page:    '#FAFBFC',
    card:    '#FFFFFF',
    muted:   '#F4F5F7',
    border:  '#DFE1E6',
    sidebar: '#F4F5F7',
  },

  /* Text (light mode) */
  text: {
    primary:   '#172B4D',
    secondary: '#6B778C',
    disabled:  '#B3BAC5',
    onBrand:   '#FFFFFF',
  },

  /* Charts */
  chart: ['#0C66E4', '#16A34A', '#D97706', '#7C3AED', '#DC2626'],
} as const;

export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    color: COLORS.priority.high,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    color: COLORS.priority.medium,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    color: COLORS.priority.low,
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
} as const;

export const STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    color: COLORS.status.todo,
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    color: COLORS.status.in_progress,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  in_review: {
    label: 'In Review',
    color: COLORS.status.in_review,
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
  done: {
    label: 'Done',
    color: COLORS.status.done,
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;
export type TaskStatus = keyof typeof STATUS_CONFIG;

export const AVATAR_PALETTE = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const;

/** Deterministic avatar color from a string (e.g. user id or name) */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
