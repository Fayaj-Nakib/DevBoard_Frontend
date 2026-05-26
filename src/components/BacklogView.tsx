'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Task, ProjectStatus } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  statuses: ProjectStatus[];
  onTaskClick: (task: Task) => void;
  onRefresh?: () => void;
}

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-yellow-400',
  low:    'bg-green-500',
};

export default function BacklogView({ workspaceId, projectId, statuses, onTaskClick, onRefresh }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchBacklog = useCallback(() => {
    setLoading(true);
    api
      .get<Task[]>(`/workspaces/${workspaceId}/projects/${projectId}/backlog`)
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  const removeFromBacklog = async (task: Task) => {
    setMovingId(task.id);
    try {
      await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}/backlog-toggle`);
      fetchBacklog();
      onRefresh?.();
    } finally {
      setMovingId(null);
    }
  };

  const moveToStatus = async (task: Task, statusId: string) => {
    setMovingId(task.id);
    try {
      await api.put(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`, {
        project_status_id: statusId,
        is_backlog: false,
      });
      fetchBacklog();
      onRefresh?.();
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading backlog…</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
        <p className="text-2xl">📋</p>
        <p className="text-gray-500 text-sm font-medium">Backlog is empty</p>
        <p className="text-gray-400 text-xs">Open a task and toggle "Add to Backlog" to queue it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-3">{tasks.length} task{tasks.length !== 1 ? 's' : ''} in backlog</p>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />

          <button
            type="button"
            onClick={() => onTaskClick(task)}
            className="flex-1 text-sm font-medium text-gray-800 text-left truncate hover:text-blue-600"
          >
            {task.title}
          </button>

          {task.estimate != null && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{task.estimate}pt</span>
          )}

          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1 flex-shrink-0">
              {task.assignees.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  title={a.name}
                  className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-semibold ring-1 ring-white"
                >
                  {a.name[0].toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Move to board column */}
          {statuses.length > 0 && (
            <div className="relative group flex-shrink-0">
              <button
                type="button"
                className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50"
                disabled={movingId === task.id}
              >
                Move to board ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-20 min-w-40 hidden group-focus-within:block group-hover:block">
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => moveToStatus(task, s.id)}
                    disabled={movingId === task.id}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => removeFromBacklog(task)}
            disabled={movingId === task.id}
            title="Remove from backlog"
            className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
