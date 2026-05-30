import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Echo from 'laravel-echo';
import api from '@/lib/api';
import type { Task, TaskFilters } from '@/types';

function buildQueryString(filters: TaskFilters): string {
  const p = new URLSearchParams();
  filters.label_ids?.forEach((id) => p.append('label_ids[]', id));
  filters.assignee_ids?.forEach((id) => p.append('assignee_ids[]', id));
  if (filters.milestone_id) p.set('milestone_id', filters.milestone_id);
  if (filters.due_date_from) p.set('due_date_from', filters.due_date_from);
  if (filters.due_date_to) p.set('due_date_to', filters.due_date_to);
  if (filters.status) p.set('status', filters.status);
  if (filters.has_subtasks) p.set('has_subtasks', '1');
  if (filters.is_overdue) p.set('is_overdue', '1');
  if (filters.watcher_id) p.set('watcher_id', filters.watcher_id);
  if (filters.sort_by) p.set('sort_by', filters.sort_by);
  if (filters.sort_dir) p.set('sort_dir', filters.sort_dir);
  const str = p.toString();
  return str ? `?${str}` : '';
}

export function useTasks(
  workspaceId: string,
  projectId: string,
  filters: TaskFilters = {},
  echo?: Echo<'reverb'> | null,
) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<Echo<'reverb'>['private']> | null>(null);

  const queryStr = useMemo(
    () => buildQueryString(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      (filters.label_ids ?? []).join(','),
      (filters.assignee_ids ?? []).join(','),
      filters.milestone_id ?? '',
      filters.due_date_from ?? '',
      filters.due_date_to ?? '',
      filters.status ?? '',
      filters.has_subtasks ? '1' : '',
      filters.is_overdue ? '1' : '',
      filters.watcher_id ?? '',
      filters.sort_by ?? '',
      filters.sort_dir ?? '',
    ],
  );

  const fetchTasks = useCallback(() => {
    api
      .get<Record<string, Task[]>>(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks${queryStr}`,
      )
      .then((r) => {
        const data = r.data;
        setTasks(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
      })
      .catch(() => setTasks({}))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, queryStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to real-time project events via Reverb
  useEffect(() => {
    if (!echo) return;

    const channel = echo.private(`private-project.${projectId}`);
    channelRef.current = channel;

    channel.listen('.task.created', (data: { task: Task }) => {
      setTasks((prev) => {
        const key = data.task.project_status_id ?? data.task.status;
        const col = prev[key] ?? [];
        if (col.some((t) => t.id === data.task.id)) return prev;
        return { ...prev, [key]: [data.task, ...col] };
      });
    });

    channel.listen('.task.updated', (data: { task: Task }) => {
      setTasks((prev) => {
        const next = { ...prev };
        // Remove from whichever column it currently lives in
        let found = false;
        for (const key of Object.keys(next)) {
          const idx = next[key].findIndex((t) => t.id === data.task.id);
          if (idx !== -1) {
            next[key] = next[key].filter((t) => t.id !== data.task.id);
            found = true;
            break;
          }
        }
        // Place in the correct column based on updated status
        const newKey = data.task.project_status_id ?? data.task.status;
        next[newKey] = [data.task, ...(next[newKey] ?? [])];
        void found;
        return next;
      });
    });

    channel.listen('.task.deleted', (data: { task_id: string; status: string }) => {
      setTasks((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((t) => t.id !== data.task_id);
        }
        return next;
      });
    });

    return () => {
      echo.leave(`private-project.${projectId}`);
      channelRef.current = null;
    };
  }, [echo, projectId]);

  const reorder = async (items: { id: string; status: string; position: number }[]) => {
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/reorder`, {
      tasks: items,
    });
    fetchTasks();
  };

  return { tasks, loading, reorder, refresh: fetchTasks };
}
