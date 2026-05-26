'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import KanbanBoard, { ReorderItem } from '@/components/kanban/KanbanBoard';
import BacklogView from '@/components/BacklogView';
import TaskDetailModal from '@/components/TaskDetailModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import SprintPanel from '@/components/SprintPanel';
import FilterBar from '@/components/FilterBar';
import BulkActionBar from '@/components/BulkActionBar';
import NotificationsBell from '@/components/NotificationsBell';
import type { Task, TaskFilters } from '@/types';

type ViewTab = 'board' | 'backlog';

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>('board');

  // ── Project statuses (for dynamic board columns) ──────────────────────────
  const { statuses } = useProjectStatuses(workspaceId, projectId);

  // ── Derive filters from URL params ───────────────────────────────────────
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

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const { tasks, loading, reorder, refresh } = useTasks(workspaceId, projectId, filters);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSprints, setShowSprints] = useState(false);

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleReorder = (items: ReorderItem[]) => reorder(items);
  const handleTaskClick = (task: Task) => {
    if (selectedIds.size > 0) {
      toggleSelectTask(task.id);
      return;
    }
    setSelectedTaskId(task.id);
  };

  // Done-task count from statuses that are is_done, or fall back to 'done' key
  const doneTasks = useMemo(() => {
    if (statuses.length > 0) {
      return statuses
        .filter((s) => s.is_done)
        .reduce((sum, s) => sum + (tasks[s.id]?.length ?? 0), 0);
    }
    return tasks['done']?.length ?? 0;
  }, [statuses, tasks]);

  const totalTasks = Object.values(tasks).reduce((sum, col) => sum + col.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            ← Projects
          </button>
          <span className="text-gray-200 text-lg">/</span>

          {/* View tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`text-sm px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'board' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backlog')}
              className={`text-sm px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'backlog' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Backlog
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalTasks > 0 && activeTab === 'board' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              <span className="text-green-600 font-semibold">{doneTasks}</span>
              <span>/ {totalTasks} done</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSprints(true)}
            className="text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <span>⚡</span> Sprints
          </button>

          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/labels`)}
            className="text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <span>🏷</span> Labels
          </button>

          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}/settings`)}
            className="text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5"
            title="Project settings"
          >
            ⚙️
          </button>

          <NotificationsBell />
          <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
          <button type="button" onClick={logout} className="text-sm text-red-400 hover:text-red-600">
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6">
        {activeTab === 'board' ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1.5"
              >
                + New Task
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel selection ({selectedIds.size})
                </button>
              )}
            </div>

            <FilterBar
              workspaceId={workspaceId}
              projectId={projectId}
              filters={filters}
              onChange={handleFilterChange}
            />

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 text-sm">Loading tasks…</p>
              </div>
            ) : (
              <KanbanBoard
                tasks={tasks}
                columns={statuses.length > 0 ? statuses : undefined}
                onReorder={handleReorder}
                onTaskClick={handleTaskClick}
                selectedIds={selectedIds}
                onSelectTask={toggleSelectTask}
              />
            )}
          </>
        ) : (
          <BacklogView
            workspaceId={workspaceId}
            projectId={projectId}
            statuses={statuses}
            onTaskClick={handleTaskClick}
            onRefresh={refresh}
          />
        )}
      </div>

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
          onClose={() => setShowCreate(false)}
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
    </div>
  );
}
