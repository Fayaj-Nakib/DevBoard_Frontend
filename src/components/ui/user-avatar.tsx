import { cn, avatarBg, initials } from '@/lib/utils';

interface Props {
  name: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLS = {
  xs: 'w-5 h-5 text-[9px]  ring-1',
  sm: 'w-6 h-6 text-[10px] ring-1',
  md: 'w-7 h-7 text-[11px] ring-2',
  lg: 'w-8 h-8 text-xs     ring-2',
} as const;

export function UserAvatar({ name, id, size = 'sm', className }: Props) {
  const bg = avatarBg(id ?? name);
  return (
    <span
      title={name}
      className={cn(
        'rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0 ring-background select-none',
        bg,
        SIZE_CLS[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

interface GroupProps {
  users: { id: string; name: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = 'sm', className }: GroupProps) {
  const shown = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {shown.map((u) => (
        <UserAvatar key={u.id} name={u.name} id={u.id} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium ring-2 ring-background text-[10px]',
            SIZE_CLS[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
