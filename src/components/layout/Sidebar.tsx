'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FolderKanban,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
  Home,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: (workspaceId: string) => string;
  matchSegment?: string;
  exactMatch?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    icon: Home,
    href: (id) => `/workspaces/${id}/dashboard`,
    matchSegment: '/dashboard',
  },
  {
    label: 'Projects',
    icon: FolderKanban,
    href: (id) => `/workspaces/${id}/projects`,
    matchSegment: '/projects',
  },
  {
    label: 'Labels',
    icon: Tag,
    href: (id) => `/workspaces/${id}/labels`,
    matchSegment: '/labels',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    href: (id) => `/workspaces/${id}/analytics`,
    matchSegment: '/analytics',
  },
  {
    label: 'Backlog',
    icon: Layers,
    href: (id) => `/workspaces/${id}/backlog`,
    matchSegment: '/backlog',
  },
];

interface Props {
  workspaceId: string;
  collapsed: boolean;
  onToggle: () => void;
}

function NavLink({
  item,
  workspaceId,
  active,
  collapsed,
}: {
  item: NavItem;
  workspaceId: string;
  active: boolean;
  collapsed: boolean;
}) {
  const router = useRouter();
  const href = item.href(workspaceId);

  const inner = (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={cn(
        'w-full flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{inner}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function Sidebar({ workspaceId, collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-sidebar border-r border-sidebar-border sidebar-transition overflow-hidden',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center h-14 border-b border-sidebar-border flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'px-4 gap-2.5',
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-sidebar-foreground tracking-tight">DevBoard</span>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-1.5' : 'px-2')}>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.matchSegment
              ? pathname.includes(item.matchSegment)
              : pathname === item.href(workspaceId);
            return (
              <NavLink
                key={item.label}
                item={item}
                workspaceId={workspaceId}
                active={active}
                collapsed={collapsed}
              />
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-4 pt-3 border-t border-sidebar-border">
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Settings
            </p>
            <NavLink
              item={{
                label: 'Workspace Settings',
                icon: Settings,
                href: (id) => `/workspaces/${id}/settings`,
                matchSegment: '/settings',
              }}
              workspaceId={workspaceId}
              active={pathname.includes('/settings')}
              collapsed={false}
            />
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className={cn('flex-shrink-0 border-t border-sidebar-border py-2', collapsed ? 'px-1.5' : 'px-2')}>
        <Tooltip>
          <TooltipTrigger>
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium',
                'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors',
                collapsed && 'justify-center',
              )}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Expand sidebar</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
