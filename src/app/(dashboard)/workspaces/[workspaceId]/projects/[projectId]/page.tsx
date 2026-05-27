'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import { useEcho } from '@/hooks/useEcho';
import KanbanBoard, { ReorderItem } from '@/components/kanban/KanbanBoard';
import BacklogView from '@/components/BacklogView';
import TimelineView from '@/components/TimelineView';
import CalendarView from '@/components/CalendarView';
import WorkloadView from '@/components/WorkloadView';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import TaskDetailModal from '@/components/TaskDetailModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import SprintPanel from '@/components/SprintPanel';
import FilterBar from '@/components/FilterBar';
import BulkActionBar from '@/components/BulkActionBar';
import NotificationsBell from '@/components/NotificationsBell';
import CommandPalette from '@/components/CommandPalette';
import type { Task, TaskFilters } from '@/types';

type ViewTab = 'board' | 'backlog' | 'timeline' | 'calendar' | 'workload' | 'analytics';

const TABS: { id: ViewTab; label: string; icon: string }[] = [
  { id: 'board',     label: 'Board',     icon: '▦' },
  { id: 'backlog',   label: 'Backlog',   icon: '☰' },
  { id: 'timeline',  label: 'Timeline',  icon: '⟶' },
  { id: 'calendar',  label: 'Calendar',  icon: '◫' },
  { id: 'workload',  label: 'Workload',  icon: '◎' },
  { id: 'analytics', label: 'Analytics', icon: '↗' },
];

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>('board');
  const [createWithDate, setCreateWithDate] = useState<string | undefined>();

  const { echo, connected } = useEcho();
  const { statuses } = useProjectStatuses(workspaceId, projectId);

  const filters = useMemo<TaskFilters>(() => ({
    label_ids:      searchParams.getAll('label_ids[]').length ? searchParams.getAll('label_ids[]') : undefined,
    assignee_ids:   searchParams.getAll('assignee_ids[]').length ? searchParams.getAll('assignee_ids[]') : undefined,
    milestone_id:   searchParams.get('milestone_id') ?? undefined,
    due_date_from:  searchParams.get('due_date_from') ?? undefined,
    due_date_to:    searchParams.get('due_date_to') ?? undefined,
    status:         searchParams.get('status') ?? undefined,
    has_subtasks:   searchParams.get('has_subtasks') === '1' || undefined,
    is_overdue:     searchParams.get('is_overdue') === '1' || undefined,
    watcher_id:     searchParams.get('watcher_id') ?? undefined,
    sort_by:        (searchParams.get('sort_by') as TaskFilters['sort_by']) ?? undefined,
    sort_dir:       (searchParams.get('sort_dir') as TaskFilters['sort_dir']) ?? undefined,
  }), [searchParams]);

  const handleFilterChange = useCallback((newFilters: TaskFilters) => {
    const p = new URLSearchParams();
    newFilters.label_ids?.forEach((id) => p.append('label_ids[]', id));
    newFilters.assignee_ids?.forEach((id) => p.append('assignee_ids[]', id));
    if (newFilters.milestone_id) p.set('milestone_id', newFilters.milestone_id);
    if (newFilters.due_date_from) p.set('due_date_from', newFilters.due_date_from);
    if (newFilters.due_date_to) p.set('due_date_to', newFilters.due_date_to);
    if (newFilters.status) p.set('status', newFilters.status);
    if (newFilters.has_subtasks) p.set('has_subtasks', '1');
    if (newFilters.is_overdue) p.set('is_overdue', '1');
    if (newFilters.watcher_id) p.set('watcher_id', newFilters.watcher_id);
    if (newFilters.sort_by) p.set('sort_by', newFilters.sort_by);
    if (newFilters.sort_dir) p.set('sort_dir', newFilters.sort_dir);
    const qs = p.toString();
    router.push(qs ? `?${qs}` : '?', { scroll: false });
  }, [router]);

  const { tasks, loading, reorder, refresh } = useTasks(workspaceId, projectId, filters, echo);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSprints, setShowSprints] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleReorder = (items: ReorderItem[]) => reorder(items);
  const handleTaskClick = (task: Task) => {
    if (selectedIds.size > 0) { toggleSelectTask(task.id); return; }
    setSelectedTaskId(task.id);
  };
  const handleTaskIdClick = (taskId: string) => setSelectedTaskId(taskId);

  const handleAddTask = (statusId: string) => {
    setCreateStatusId(statusId);
    setShowCreate(true);
  };

  const doneTasks = useMemo(() => {
    if (statuses.length > 0) {
      return statuses
        .filter((s) => s.is_done)
        .reduce((sum, s) => sum + (tasks[s.id]?.length ?? 0), 0);
    }
    return tasks['done']?.length ?? 0;
  }, [statuses, tasks]);

  const totalTasks = Object.values(tasks).reduce((sum, col) => sum + col.length, 0);
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleCalendarCreateDate = (date: string) => {
    setCreateWithDate(date);
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      {/* Top nav bar */}
      <header className="bg-white border-b border-[#DFE1E6] sticky top-0 z-20">
        {/* Breadcrumb + actions row */}
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
              className="flex items-center gap-1.5 text-[#626F86] hover:text-[#0052CC] text-sm font-medium transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Projects
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DFE1E6" strokeWidth="2" className="flex-shrink-0">
              <path d="m9 18 6-6-6-6"/>
            </svg>
            <span className="text-sm font-semibold text-[#172B4D] truncate">Board</span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {connected && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-[#57D9A3] font-medium bg-[#E3FCEF] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57D9A3] animate-pulse" />
                Live
              </span>
            )}

            {totalTasks > 0 && activeTab === 'board' && (
              <div className="hidden md:flex items-center gap-1.5 text-xs bg-[#F4F5F7] rounded-full px-3 py-1.5 border border-[#DFE1E6]">
                <span className="font-bold text-[#36B37E]">{progressPct}%</span>
                <span className="text-[#DFE1E6]">|</span>
                <span className="text-[#626F86]">{doneTasks}/{totalTasks} done</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSprints(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#626F86] border border-[#DFE1E6] rounded px-2.5 py-1.5 hover:bg-[#F4F5F7] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Sprints
            </button>

            <button
              type="button"
              onClick={() => router.push(`/workspaces/${workspaceId}/labels`)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#626F86] border border-[#DFE1E6] rounded px-2.5 py-1.5 hover:bg-[#F4F5F7] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Labels
            </button>

            <button
              type="button"
              onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}/settings`)}
              className="flex items-center justify-center w-8 h-8 text-[#626F86] border border-[#DFE1E6] rounded hover:bg-[#F4F5F7] transition-colors"
              title="Project settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowPalette(true)}
              title="Search (Ctrl+K)"
              className="flex items-center gap-1.5 text-xs font-medium text-[#626F86] border border-[#DFE1E6] rounded px-2.5 py-1.5 hover:bg-[#F4F5F7] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="hidden sm:inline text-[#B3BAC5] text-[11px]">⌘K</span>
            </button>

            <div className="w-px h-5 bg-[#DFE1E6]" />

            <NotificationsBell />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0052CC] text-white text-[11px] flex items-center justify-center font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm text-[#172B4D] font-medium hidden lg:block">{user?.name}</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="text-xs text-[#626F86] hover:text-red-500 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex items-center gap-0 border-t border-[#DFE1E6]">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === id
                  ? 'text-[#0052CC] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#0052CC]'
                  : 'text-[#626F86] hover:text-[#172B4D] hover:bg-[#F4F5F7]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 min-h-0">
        {activeTab === 'board' && (
          <div>
            {/* Board toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setCreateStatusId(undefined); setShowCreate(true); }}
                  className="flex items-center gap-1.5 bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm font-medium px-3.5 py-2 rounded transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create task
                </button>

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm text-[#626F86] hover:text-[#172B4D] flex items-center gap-1 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                    {selectedIds.size} selected
                  </button>
                )}
              </div>
            </div>

            <FilterBar
              workspaceId={workspaceId}
              projectId={projectId}
              filters={filters}
              onChange={handleFilterChange}
            />

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#626F86] text-sm">Loading board…</p>
              </div>
            ) : (
              <KanbanBoard
                tasks={tasks}
                columns={statuses.length > 0 ? statuses : undefined}
                onReorder={handleReorder}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                selectedIds={selectedIds}
                onSelectTask={toggleSelectTask}
              />
            )}
          </div>
        )}

        {activeTab === 'backlog' && (
          <BacklogView
            workspaceId={workspaceId}
            projectId={projectId}
            statuses={statuses}
            onTaskClick={handleTaskClick}
            onRefresh={refresh}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            workspaceId={workspaceId}
            projectId={projectId}
            onTaskClick={handleTaskIdClick}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            workspaceId={workspaceId}
            projectId={projectId}
            currentUserId={user?.id}
            onTaskClick={handleTaskIdClick}
            onCreateWithDate={handleCalendarCreateDate}
          />
        )}

        {activeTab === 'workload' && (
          <WorkloadView
            workspaceId={workspaceId}
            projectId={projectId}
            onTaskClick={handleTaskIdClick}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}
      </main>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={refresh}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          workspaceId={workspaceId}
          projectId={projectId}
          defaultDueDate={createWithDate}
          defaultStatusId={createStatusId}
          onClose={() => { setShowCreate(false); setCreateWithDate(undefined); setCreateStatusId(undefined); }}
          onCreate={refresh}
        />
      )}

      {showSprints && (
        <SprintPanel
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowSprints(false)}
        />
      )}

      <BulkActionBar
        selectedIds={[...selectedIds]}
        workspaceId={workspaceId}
        projectId={projectId}
        onClear={clearSelection}
        onRefresh={refresh}
      />

      {showPalette && (
        <CommandPalette
          workspaceId={workspaceId}
          onClose={() => setShowPalette(false)}
          onTaskClick={(taskId) => { setSelectedTaskId(taskId); setShowPalette(false); }}
        />
      )}
    </div>
  );
}
