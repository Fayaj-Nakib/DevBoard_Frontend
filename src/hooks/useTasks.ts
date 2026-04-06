import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export function useTasks(workspaceId: string, projectId: string) {
  const [tasks, setTasks] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    api.get(`/workspaces/${workspaceId}/projects/${projectId}/tasks`)
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const create = async (data: any) => {
    await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, data);
    fetchTasks();
  };

  const reorder = async (items: any[]) => {
    await api.patch(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/reorder`,
      { tasks: items }
    );
    fetchTasks();
  };

  return { tasks, loading, create, reorder, refresh: fetchTasks };
}