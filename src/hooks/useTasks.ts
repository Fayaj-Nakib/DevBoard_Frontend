import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Task } from '@/types';

export function useTasks(workspaceId: string, projectId: string) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    api.get<Record<string, Task[]>>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`
    )
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const reorder = async (items: { id: string; status: string; position: number }[]) => {
    await api.patch(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/reorder`,
      { tasks: items }
    );
    fetchTasks();
  };

  return { tasks, loading, reorder, refresh: fetchTasks };
}
