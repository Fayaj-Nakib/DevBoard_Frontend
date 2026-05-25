import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useTasks(workspaceId: string, projectId: string, filters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  // Stable query string — only changes when filter values actually change
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
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, queryStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const reorder = async (items: { id: string; status: string; position: number }[]) => {
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/reorder`, {
      tasks: items,
    });
    fetchTasks();
  };

  return { tasks, loading, reorder, refresh: fetchTasks };
}
