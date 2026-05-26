'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { SearchResults, SearchResult } from '@/types';

interface Props {
  workspaceId: string;
  onClose: () => void;
  onTaskClick?: (taskId: string, projectId: string) => void;
}

const RECENT_KEY = 'devboard_recent_searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); }
  catch { return []; }
}

function saveRecent(q: string) {
  const prev = getRecent().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

type ResultGroup = { label: string; items: SearchResult[] };

const TYPE_ICONS: Record<string, string> = {
  task: '✦',
  project: '◈',
  comment: '✉',
  member: '◎',
};

export default function CommandPalette({ workspaceId, onClose, onTaskClick }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    api.get<SearchResults>('/search', { params: { q: q.trim(), workspace_id: workspaceId } })
      .then((r) => { setResults(r.data); setCursor(0); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const flatItems: SearchResult[] = results
    ? [...results.tasks, ...results.projects, ...results.comments, ...results.members]
    : [];

  const groups: ResultGroup[] = results ? [
    { label: 'Tasks', items: results.tasks },
    { label: 'Projects', items: results.projects },
    { label: 'Comments', items: results.comments },
    { label: 'Members', items: results.members },
  ].filter((g) => g.items.length > 0) : [];

  const navigate = useCallback((item: SearchResult) => {
    saveRecent(query);
    onClose();
    if (item.type === 'task' && item.project_id) {
      if (onTaskClick && item.project_id) {
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
  }, [query, onClose, onTaskClick, router, workspaceId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && flatItems[cursor]) {
      navigate(flatItems[cursor]);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[12vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <span className="text-gray-400 text-base">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, comments…"
            className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
          />
          {loading && (
            <span className="text-xs text-gray-400 animate-pulse">Searching…</span>
          )}
          <kbd className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 font-mono">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {/* No query: show recent searches */}
          {!query && (
            <div className="px-4 py-3">
              {getRecent().length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 uppercase font-medium mb-2">Recent searches</p>
                  {getRecent().map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleChange(r)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left text-sm text-gray-600"
                    >
                      <span className="text-gray-300">↺</span>
                      {r}
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Type at least 2 characters to search…</p>
              )}
            </div>
          )}

          {/* Results */}
          {results && groups.length === 0 && !loading && (
            <p className="text-sm text-gray-400 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}

          {groups.map((group) => {
            return (
              <div key={group.label}>
                <p className="text-xs text-gray-400 uppercase font-medium px-4 pt-3 pb-1">{group.label}</p>
                {group.items.map((item) => {
                  const globalIndex = flatItems.indexOf(item);
                  const isActive = globalIndex === cursor;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => navigate(item)}
                      className={`flex items-start gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400 text-sm flex-shrink-0 mt-0.5">
                        {TYPE_ICONS[item.type] ?? '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.project_name ?? item.email ?? item.task_title ?? ''}
                        </p>
                      </div>
                      {item.status && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                          {item.status.replace('_', ' ')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-gray-50 flex gap-4 text-xs text-gray-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
