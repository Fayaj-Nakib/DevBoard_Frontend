import { cn, getStatusColor } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
  cancelled:   'Cancelled',
  blocked:     'Blocked',
};

interface Props {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, label, size = 'md', className }: Props) {
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        getStatusColor(status),
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {displayLabel}
    </span>
  );
}
