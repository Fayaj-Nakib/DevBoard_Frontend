'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import api from '@/lib/api';

const SIDEBAR_COLLAPSED_KEY = 'devboard:sidebar:collapsed';

interface Props {
  workspaceId: string;
  /** Override display name — if omitted, fetched automatically */
  workspaceName?: string;
  onSearchOpen?: () => void;
  /** Content rendered in the TopNav breadcrumb area */
  navLeft?: React.ReactNode;
  /** Content rendered below the TopNav bar (e.g. tab bar) */
  subNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({
  workspaceId,
  workspaceName: workspaceNameProp,
  onSearchOpen,
  navLeft,
  subNav,
  children,
  className,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspaceNameProp ?? '');

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  // Auto-fetch workspace name when not provided
  useEffect(() => {
    if (workspaceNameProp || !workspaceId) return;
    api.get(`/workspaces/${workspaceId}`)
      .then((r) => setWorkspaceName(r.data?.name ?? ''))
      .catch(() => { /* ignore — name stays empty */ });
  }, [workspaceId, workspaceNameProp]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <div className={cn('flex h-screen overflow-hidden bg-background', className)}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          workspaceId={workspaceId}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </div>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[240px] bg-sidebar border-sidebar-border">
          <Sidebar
            workspaceId={workspaceId}
            collapsed={false}
            onToggle={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <TopNav
          workspaceId={workspaceId}
          workspaceName={workspaceName || undefined}
          onSearchOpen={onSearchOpen}
          leftSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
              {navLeft}
            </div>
          }
        />

        {subNav && (
          <div className="border-b border-border bg-background flex-shrink-0">
            {subNav}
          </div>
        )}

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
