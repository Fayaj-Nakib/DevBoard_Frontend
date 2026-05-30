'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search } from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SearchResults, SearchResult } from '@/types';

import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const RECENT_KEY = 'devboard_recent_searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}

function saveRecent(q: string) {
  if (!q.trim()) return;
  const prev = getRecent().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    todo: 'bg-muted-foreground',
    in_progress: 'bg-primary',
    in_review: 'bg-warning',
    done: 'bg-success',
    cancelled: 'bg-destructive',
  };
  return (
    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', colors[status ?? ''] ?? 'bg-muted-foreground')} />
  );
}

interface Props {
  workspaceId: string;
  onClose: () => void;
  onTaskClick?: (taskId: string, projectId: string) => void;
}

export default function CommandPalette({ workspaceId, onClose, onTaskClick }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent] = useState<string[]>(() => getRecent());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // displayResults is null when query is too short — derived, no effect needed
  const displayResults = query.trim().length >= 2 ? results : null;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.get<SearchResults>('/search', { params: { q: query.trim(), workspace_id: workspaceId } })
        .then((r) => setResults(r.data))
        .finally(() => setLoading(false));
    }, 300);
  }, [query, workspaceId]);

  const navigate = (item: SearchResult) => {
    saveRecent(query);
    onClose();
    if (item.type === 'task' && item.project_id) {
      if (onTaskClick) {
        onTaskClick(item.id, item.project_id);
      } else {
        router.push(`/workspaces/${workspaceId}/projects/${item.project_id}?task=${item.id}`);
      }
    } else if (item.type === 'project') {
      router.push(`/workspaces/${workspaceId}/projects/${item.id}`);
    } else if (item.type === 'comment' && item.task_id && item.project_id) {
      if (onTaskClick) {
        onTaskClick(item.task_id, item.project_id);
      } else {
        router.push(`/workspaces/${workspaceId}/projects/${item.project_id}?task=${item.task_id}`);
      }
    }
  };

  const hasTasks = (displayResults?.tasks?.length ?? 0) > 0;
  const hasProjects = (displayResults?.projects?.length ?? 0) > 0;
  const hasMembers = (displayResults?.members?.length ?? 0) > 0;
  const hasAny = hasTasks || hasProjects || hasMembers;

  return (
    <CommandDialog
      open
      onOpenChange={(v) => { if (!v) onClose(); }}
      title="Search"
      description="Search tasks, projects, and members"
      className="max-w-xl"
    >
      <CommandInput
        placeholder="Search tasks, projects, members…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-96">
        {/* Empty state */}
        <CommandEmpty>
          {loading ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-foreground-tertiary animate-pulse">Searching…</p>
            </div>
          ) : query.length >= 2 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="w-8 h-8 text-foreground-muted mb-2" />
              <p className="text-sm text-foreground-secondary">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="w-8 h-8 text-foreground-muted mb-2" />
              <p className="text-sm text-foreground-secondary">Type to search…</p>
            </div>
          )}
        </CommandEmpty>

        {/* Recent searches — shown when query is empty */}
        {!query && recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((s, i) => (
              <CommandItem key={i} onSelect={() => setQuery(s)}>
                <Clock className="w-4 h-4 mr-3 text-foreground-tertiary flex-shrink-0" />
                {s}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Tasks */}
        {hasTasks && (
          <CommandGroup heading="Tasks">
            {displayResults!.tasks.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => navigate(t)}
                className="flex items-center gap-3"
              >
                <StatusDot status={t.status} />
                <span className="flex-1 text-sm truncate">{t.title}</span>
                {t.project_name && (
                  <span className="text-xs text-foreground-tertiary bg-muted px-2 py-0.5 rounded flex-shrink-0">
                    {t.project_name}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Projects */}
        {hasProjects && (
          <CommandGroup heading="Projects">
            {displayResults!.projects.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => navigate(p)}
                className="flex items-center gap-3"
              >
                <span className="w-3 h-3 rounded-sm bg-primary flex-shrink-0" />
                <span className="text-sm flex-1">{p.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Members */}
        {hasMembers && (
          <CommandGroup heading="Members">
            {displayResults!.members.map((m) => (
              <CommandItem key={m.id} className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px]">{initials(m.title)}</AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1">{m.title}</span>
                {m.email && (
                  <span className="text-xs text-foreground-tertiary ml-auto">{m.email}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer */}
      {(hasAny || recent.length > 0) && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-foreground-muted">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      )}
    </CommandDialog>
  );
}
