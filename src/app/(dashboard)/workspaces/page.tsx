'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
}

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  const createWorkspace = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    api.post('/workspaces', { name: newName.trim() })
      .then((r) => { setWorkspaces((prev) => [...prev, r.data]); setNewName(''); })
      .catch(() => {})
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
        <form onSubmit={createWorkspace} className="flex gap-3 mb-8">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New workspace name…"
            className="flex-1"
          />
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            Create
          </Button>
        </form>

        {/* Workspace grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mb-3">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground-secondary mb-1">No workspaces yet</p>
            <p className="text-xs text-foreground-tertiary">Create your first workspace above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                onClick={() => router.push(`/workspaces/${ws.id}/projects`)}
                className="p-5 hover:border-border-strong hover:shadow-sm hover:-translate-y-[1px] transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-subtle flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground truncate">{ws.name}</h3>
                    <p className="text-xs text-foreground-tertiary mt-0.5 font-mono truncate">{ws.slug}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
