'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, LogOut, Settings, ChevronDown } from 'lucide-react';
import NotificationsBell from '@/components/NotificationsBell';
import { ThemeToggle } from '@/components/theme-toggle';

interface Props {
  workspaceId?: string;
  workspaceName?: string;
  onSearchOpen?: () => void;
  leftSlot?: React.ReactNode;
  className?: string;
}

export function TopNav({ workspaceId, workspaceName, onSearchOpen, leftSlot, className }: Props) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header
      className={cn(
        'h-[52px] flex items-center justify-between px-4 border-b border-topnav-border bg-topnav flex-shrink-0',
        className,
      )}
    >
      {/* Left slot — passed-in breadcrumb or extra content */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {workspaceName && workspaceId && (
          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <span className="truncate max-w-[160px]">{workspaceName}</span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
          </button>
        )}
        {leftSlot && <div className="flex-1 min-w-0">{leftSlot}</div>}
      </div>

      {/* Right slot — search + bells + user */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onSearchOpen && (
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] bg-muted px-1 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        )}

        <ThemeToggle />

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors outline-none"
            aria-label="User menu"
          >
            <UserAvatar name={user?.name ?? '?'} id={user?.id} size="sm" />
            <span className="hidden md:block text-sm font-medium text-foreground max-w-[100px] truncate">
              {user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            {workspaceId && (
              <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}>
                <Settings className="w-4 h-4 mr-2" />
                Workspace settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
