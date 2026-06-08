'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutGrid, List, GanttChart, CalendarDays, Layers,
  BarChart3, UserPlus, MoreHorizontal, Settings, Trash2,
  Link2, Filter, X, Search, Check, Zap, Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import { useEcho } from '@/hooks/useEcho';
import api from '@/lib/api';
import { cn, initials, avatarBg } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import KanbanBoard, { ReorderItem } from '@/components/kanban/KanbanBoard';
import FilterBar from '@/components/FilterBar';
import BacklogView from '@/components/BacklogView';
import TimelineView from '@/components/TimelineView';
import CalendarView from '@/components/CalendarView';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ListView from '@/components/ListView';
import WorkloadView from '@/components/WorkloadView';
import TaskDetailModal from '@/components/TaskDetailModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import SprintPanel from '@/components/SprintPanel';
import BulkActionBar from '@/components/BulkActionBar';
import CommandPalette from '@/components/CommandPalette';
import type { Project, ProjectMember, Sprint, Task, TaskFilters } from '@/types';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type ViewTab = 'board' | 'list' | 'timeline' | 'calendar' | 'backlog' | 'analytics' | 'workload';

interface ViewDef {
  id: ViewTab;
  label: string;
  icon: React.ElementType;
}

const VIEWS: ViewDef[] = [
  { id: 'board',     label: 'Board',     icon: LayoutGrid  },
  { id: 'list',      label: 'List',      icon: List        },
  { id: 'timeline',  label: 'Timeline',  icon: GanttChart  },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarDays },
  { id: 'backlog',   label: 'Backlog',   icon: Layers      },
  { id: 'analytics', label: 'Analytics', icon: BarChart3   },
  { id: 'workload',  label: 'Workload',  icon: UserPlus    },
];

/* ─── Main page — wraps in Suspense for useSearchParams ─────────────────────── */
export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectPageInner />
    </Suspense>
  );
}

/* ─── Inner page ─────────────────────────────────────────────────────────────── */
function ProjectPageInner() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /* ── Project + member details ─────────────────────────────────────────── */
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  useEffect(() => {
    api.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`)
      .then((r) => setProject(r.data))
      .catch(() => {});
    api.get<ProjectMember[]>(`/workspaces/${workspaceId}/projects/${projectId}/members`)
      .then((r) => setMembers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [workspaceId, projectId]);

  /* ── View state ─────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<ViewTab>('board');
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Hooks ──────────────────────────────────────────────────────────────── */
  const { echo, connected } = useEcho();
  const { statuses, refresh: refreshStatuses } = useProjectStatuses(workspaceId, projectId);

  const filters = useMemo<TaskFilters>(() => ({
    label_ids:     searchParams.getAll('label_ids[]').length ? searchParams.getAll('label_ids[]') : undefined,
    assignee_ids:  searchParams.getAll('assignee_ids[]').length ? searchParams.getAll('assignee_ids[]') : undefined,
    milestone_id:  searchParams.get('milestone_id') ?? undefined,
    due_date_from: searchParams.get('due_date_from') ?? undefined,
    due_date_to:   searchParams.get('due_date_to') ?? undefined,
    status:        searchParams.get('status') ?? undefined,
    has_subtasks:  searchParams.get('has_subtasks') === '1' || undefined,
    is_overdue:    searchParams.get('is_overdue') === '1' || undefined,
    watcher_id:    searchParams.get('watcher_id') ?? undefined,
    sort_by:       (searchParams.get('sort_by') as TaskFilters['sort_by']) ?? undefined,
    sort_dir:      (searchParams.get('sort_dir') as TaskFilters['sort_dir']) ?? undefined,
  }), [searchParams]);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true),
  ).length;

  const handleFilterChange = useCallback((newFilters: TaskFilters) => {
    const p = new URLSearchParams();
    newFilters.label_ids?.forEach((id) => p.append('label_ids[]', id));
    newFilters.assignee_ids?.forEach((id) => p.append('assignee_ids[]', id));
    if (newFilters.milestone_id)  p.set('milestone_id', newFilters.milestone_id);
    if (newFilters.due_date_from) p.set('due_date_from', newFilters.due_date_from);
    if (newFilters.due_date_to)   p.set('due_date_to', newFilters.due_date_to);
    if (newFilters.status)        p.set('status', newFilters.status);
    if (newFilters.has_subtasks)  p.set('has_subtasks', '1');
    if (newFilters.is_overdue)    p.set('is_overdue', '1');
    if (newFilters.watcher_id)    p.set('watcher_id', newFilters.watcher_id);
    if (newFilters.sort_by)       p.set('sort_by', newFilters.sort_by);
    if (newFilters.sort_dir)      p.set('sort_dir', newFilters.sort_dir);
    const qs = p.toString();
    router.push(qs ? `?${qs}` : '?', { scroll: false });
  }, [router]);

  const clearFilters = () => { router.push('?', { scroll: false }); };

  const { tasks, loading, reorder, refresh } = useTasks(workspaceId, projectId, filters, echo);

  /* ── Modal state ─────────────────────────────────────────────────────────── */
  const [selectedTaskId, setSelectedTaskId]     = useState<string | null>(null);
  const [showCreate, setShowCreate]             = useState(false);
  const [showSprints, setShowSprints]           = useState(false);
  const [showPalette, setShowPalette]           = useState(false);
  const [showFilter, setShowFilter]             = useState(false);
  const [createStatusId, setCreateStatusId]     = useState<string | undefined>();
  const [createWithDate, setCreateWithDate]     = useState<string | undefined>();
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());

  /* ── Keyboard shortcut ───────────────────────────────────────────────────── */
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

  /* ── Selection ───────────────────────────────────────────────────────────── */
  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ── Stats ───────────────────────────────────────────────────────────────── */
  const doneTasks = useMemo(() => {
    if (statuses.length > 0) {
      return statuses.filter((s) => s.is_done).reduce((sum, s) => sum + (tasks[s.id]?.length ?? 0), 0);
    }
    return tasks['done']?.length ?? 0;
  }, [statuses, tasks]);

  const totalTasks   = Object.values(tasks).reduce((sum, col) => sum + col.length, 0);
  const progressPct  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  /* ── Board actions ───────────────────────────────────────────────────────── */
  const handleReorder = (items: ReorderItem[]) => reorder(items);

  const handleTaskClick = (task: Task) => {
    if (selectedIds.size > 0) { toggleSelectTask(task.id); return; }
    setSelectedTaskId(task.id);
  };

  const handleAddTask = (statusId: string) => {
    setCreateStatusId(statusId);
    setShowCreate(true);
  };

  const handleQuickCreate = useCallback(async (title: string, statusId: string) => {
    await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
      title,
      project_status_id: statusId,
    });
    refresh();
  }, [workspaceId, projectId, refresh]);

  const handleMoveTask = useCallback(async (taskId: string, statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {
      project_status_id: statusId,
      status: status?.slug ?? 'todo',
    });
    refresh();
  }, [workspaceId, projectId, statuses, refresh]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
    refresh();
  }, [workspaceId, projectId, refresh]);

  const handleAddStatus = useCallback(async (name: string, color: string) => {
    await api.post(`/workspaces/${workspaceId}/projects/${projectId}/statuses`, { name, color });
    refreshStatuses();
  }, [workspaceId, projectId, refreshStatuses]);

  const handleCalendarCreate = (date: string) => {
    setCreateWithDate(date);
    setShowCreate(true);
  };

  /* ── Active filter chips for toolbar ────────────────────────────────────── */
  const filterChips: { key: string; label: string }[] = [];
  if (filters.status)     filterChips.push({ key: 'status',    label: `Status: ${filters.status}` });
  if (filters.is_overdue) filterChips.push({ key: 'is_overdue', label: 'Overdue' });
  if (filters.has_subtasks) filterChips.push({ key: 'has_subtasks', label: 'Has subtasks' });
  if ((filters.assignee_ids?.length ?? 0) > 0) filterChips.push({ key: 'assignee_ids', label: `${filters.assignee_ids!.length} assignee(s)` });
  if ((filters.label_ids?.length ?? 0) > 0)    filterChips.push({ key: 'label_ids', label: `${filters.label_ids!.length} label(s)` });

  const removeFilterChip = (key: string) => {
    const updated = { ...filters };
    if (key === 'assignee_ids') updated.assignee_ids = undefined;
    else if (key === 'label_ids') updated.label_ids = undefined;
    else (updated as Record<string, unknown>)[key] = undefined;
    handleFilterChange(updated);
  };

  /* ─────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">

      {/* ── Layer 1: Project header ───────────────────────────────────────── */}
      <div className="h-14 bg-background border-b border-border px-6 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
        {/* LEFT: breadcrumb + live indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/workspaces/${workspaceId}/projects`}
                  className="text-sm"
                  onClick={(e) => { e.preventDefault(); router.push(`/workspaces/${workspaceId}/projects`); }}
                >
                  Projects
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {project ? (
                  <BreadcrumbPage className="text-sm">{project.name}</BreadcrumbPage>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {connected && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-success font-medium bg-success-subtle px-2 py-0.5 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* RIGHT: progress + members + actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Progress pill */}
          {totalTasks > 0 && activeTab === 'board' && (
            <span className="hidden md:flex items-center gap-1.5 text-xs bg-muted px-3 py-1 rounded-full border border-border">
              <span className="font-semibold text-success">{progressPct}%</span>
              <span className="text-border">|</span>
              <span className="text-foreground-secondary">{doneTasks}/{totalTasks}</span>
            </span>
          )}

          {/* Sprint button */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex h-8 text-xs"
            onClick={() => setShowSprints(true)}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Sprints
          </Button>

          {/* Member avatars */}
          {members.length > 0 && (
            <div className="hidden md:flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <span
                  key={m.user.id}
                  title={m.user.name}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 border-background text-[10px] text-white font-bold flex items-center justify-center flex-shrink-0',
                    avatarBg(m.user.id),
                  )}
                >
                  {initials(m.user.name)}
                </span>
              ))}
              {members.length > 4 && (
                <span className="w-7 h-7 rounded-full border-2 border-background bg-muted text-foreground-secondary text-[10px] font-bold flex items-center justify-center">
                  +{members.length - 4}
                </span>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" className="h-8 text-xs hidden sm:flex">
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Invite
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-foreground-muted hover:text-foreground hover:bg-accent outline-none transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}/settings`)}>
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(window.location.href); }}>
                <Link2 className="w-4 h-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="w-4 h-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Layer 2: View toolbar ─────────────────────────────────────────── */}
      <div className="h-11 bg-background border-b border-border px-4 flex items-center gap-2 sticky top-14 z-20 flex-shrink-0">
        {/* View switcher tabs */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 flex-shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveTab(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all duration-150',
                activeTab === v.id
                  ? 'bg-background shadow-sm text-foreground font-medium'
                  : 'text-foreground-tertiary hover:text-foreground',
              )}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Filters */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 text-xs flex-shrink-0',
            (activeFilterCount > 0 || showFilter) && 'border-primary text-primary',
          )}
          onClick={() => setShowFilter((v) => !v)}
        >
          <Filter className="w-3 h-3 mr-1.5" />
          {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filter'}
        </Button>

        {/* Active filter chips */}
        {filterChips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-subtle text-primary-subtle-foreground rounded-full text-xs font-medium animate-slide-up flex-shrink-0"
          >
            {chip.label}
            <button
              type="button"
              onClick={() => removeFilterChip(chip.key)}
              className="hover:text-primary ml-0.5"
              aria-label={`Remove ${chip.label} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {activeFilterCount > 1 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-foreground-tertiary hover:text-destructive transition-colors flex-shrink-0"
          >
            Clear all
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sprint selector */}
        {sprints.length > 0 && (
          <select
            aria-label="Sprint filter"
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="h-7 text-xs bg-background border border-border rounded-md px-2 text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-ring w-36 flex-shrink-0"
          >
            <option value="all">All sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-tertiary pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks…"
            className={cn(
              'h-7 pl-7 pr-3 text-xs bg-muted rounded-md border border-transparent',
              'focus:outline-none focus:border-border-strong focus:bg-background',
              'transition-all duration-150 w-28 focus:w-48',
              'placeholder:text-foreground-tertiary text-foreground',
            )}
          />
        </div>

        {/* Create task */}
        <Button
          size="sm"
          className="h-7 text-xs flex-shrink-0"
          onClick={() => { setCreateStatusId(undefined); setShowCreate(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New task
        </Button>

        {/* Command palette */}
        <button
          type="button"
          onClick={() => setShowPalette(true)}
          title="Search (Ctrl+K)"
          className="h-7 flex items-center gap-1 text-xs text-foreground-tertiary border border-border rounded-md px-2 hover:bg-accent transition-colors flex-shrink-0"
        >
          <Search className="w-3 h-3" />
          <span className="hidden lg:inline text-[10px] text-foreground-muted">⌘K</span>
        </button>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      {showFilter && (
        <div className="border-b border-border bg-background px-6 py-3 flex-shrink-0">
          <FilterBar
            workspaceId={workspaceId}
            projectId={projectId}
            filters={filters}
            onChange={handleFilterChange}
          />
        </div>
      )}

      {/* ── Layer 3: Content ──────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          {loading ? (
            <div className="flex gap-3 px-6 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="min-w-[272px] flex-shrink-0 bg-background-secondary rounded-xl border border-border p-3 space-y-2"
                >
                  <Skeleton className="h-5 w-24" />
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              columns={statuses.length > 0 ? statuses : undefined}
              onReorder={handleReorder}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              onQuickCreate={handleQuickCreate}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              onAddStatus={handleAddStatus}
              selectedIds={selectedIds}
              onSelectTask={toggleSelectTask}
            />
          )}
        </div>
      )}

      {activeTab === 'backlog' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <BacklogView
            workspaceId={workspaceId}
            projectId={projectId}
            statuses={statuses}
            onTaskClick={handleTaskClick}
            onRefresh={refresh}
          />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <TimelineView
            workspaceId={workspaceId}
            projectId={projectId}
            onTaskClick={(id) => setSelectedTaskId(id)}
          />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <CalendarView
            workspaceId={workspaceId}
            projectId={projectId}
            currentUserId={user?.id}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onCreateWithDate={handleCalendarCreate}
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <ListView
            tasks={tasks}
            statuses={statuses}
            workspaceId={workspaceId}
            projectId={projectId}
            selectedIds={selectedIds}
            onSelectTask={toggleSelectTask}
            onTaskClick={handleTaskClick}
            onRefresh={refresh}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnalyticsDashboard
            workspaceId={workspaceId}
            projectId={projectId}
          />
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <WorkloadView
            workspaceId={workspaceId}
            projectId={projectId}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
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
          onClose={() => {
            setShowCreate(false);
            setCreateWithDate(undefined);
            setCreateStatusId(undefined);
          }}
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

      {/* Inline "selected" bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-slide-up">
          <Check className="w-4 h-4" />
          <span>{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-1 hover:opacity-70 transition-opacity"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
