'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, FolderOpen, Users, Clock, ArrowRight, LayoutGrid } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import NotificationsBell from '@/components/NotificationsBell';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  color?: string;
  projects_count?: number;
  members_count?: number;
  updated_at?: string;
}

function generateColorFromName(name: string): string {
  const colors = [
    '#7C3AED', '#2563EB', '#059669', '#D97706',
    '#DC2626', '#DB2777', '#0891B2', '#65A30D',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    api.get('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  const createWorkspace = () => {
    if (!newName.trim()) {
      setCreateError('Workspace name cannot be empty.');
      return;
    }
    setCreateError('');
    setCreating(true);
    api.post<Workspace>('/workspaces', { name: newName.trim() })
      .then((r) => {
        const ws = r.data;
        setWorkspaces((prev) => [...prev, ws]);
        setNewName('');
        router.push(`/workspaces/${ws.id}/dashboard`);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to create workspace. Please try again.';
        setCreateError(msg);
      })
      .finally(() => setCreating(false));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="h-[52px] flex items-center justify-between px-6 border-b border-border bg-topnav sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
            </svg>
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">DevBoard</span>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Your Workspaces</h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            Select a workspace or create a new one
          </p>
        </div>

        {/* Create form */}
        <form onSubmit={(e) => { e.preventDefault(); createWorkspace(); }} className="flex flex-col gap-2 mb-8">
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); if (createError) setCreateError(''); }}
              placeholder="New workspace name…"
              className="flex-1"
              aria-invalid={!!createError}
            />
            <Button type="submit" disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              Create
            </Button>
          </div>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
        </form>

        {/* Workspace list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[76px] rounded-xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-primary-subtle flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-primary" />
            </div>
            <p className="text-base font-semibold mb-1">No workspaces yet</p>
            <p className="text-sm text-foreground-tertiary max-w-xs">
              A workspace is your team&apos;s home in DevBoard. Create one to get started.
            </p>
          </div>
        ) : (
          <div>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => router.push(`/workspaces/${ws.id}/dashboard`)}
                className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-border-strong hover:shadow-md hover:-translate-y-[1px] cursor-pointer transition-all duration-150 mb-3"
              >
                {/* Workspace avatar */}
                <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0 rounded-xl overflow-hidden">
                  <rect width="44" height="44" fill={ws.color ?? generateColorFromName(ws.name)} />
                  <text x="22" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="inherit">
                    {ws.name.charAt(0).toUpperCase()}
                  </text>
                </svg>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{ws.name}</p>
                  <p className="text-xs text-foreground-tertiary mt-0.5">{ws.slug}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground-tertiary">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />{ws.projects_count ?? 0} projects
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{ws.members_count ?? 1} members
                    </span>
                    {ws.updated_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />Active {formatRelativeTime(ws.updated_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow on hover */}
                <ArrowRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
