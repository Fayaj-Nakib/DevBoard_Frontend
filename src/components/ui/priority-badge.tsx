import { cn, getPriorityColor } from '@/lib/utils';
import { AlertCircle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', Icon: AlertCircle },
  high:   { label: 'High',   Icon: ArrowUp    },
  medium: { label: 'Medium', Icon: ArrowRight  },
  low:    { label: 'Low',    Icon: ArrowDown   },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;

interface Props {
  priority: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function PriorityBadge({ priority, showLabel = true, size = 'md', className }: Props) {
  const cfg = PRIORITY_CONFIG[priority as Priority];
  const colorCls = getPriorityColor(priority);
  const Icon = cfg?.Icon ?? ArrowRight;
  const label = cfg?.label ?? priority;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (!showLabel) {
    return <Icon className={cn(iconSize, colorCls, className)} aria-label={label} />;
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', colorCls, className)}>
      <Icon className={iconSize} aria-hidden="true" />
      {label}
    </span>
  );
}

export { PRIORITY_CONFIG };
export type { Priority };
