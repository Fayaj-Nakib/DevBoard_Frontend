'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import KanbanBoard, { Task, ReorderItem } from '@/components/kanban/KanbanBoard';
import TaskDetailModal from '@/components/TaskDetailModal';
import NotificationsBell from '@/components/NotificationsBell';

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const router = useRouter();
  const { logout, user } = useAuth();

  const { tasks, loading, create, reorder, refresh } = useTasks(workspaceId, projectId);

  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const createTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await create({ title: newTitle, priority: 'medium' });
      setNewTitle('');
    } finally {
      setCreating(false);
    }
  };

  const handleReorder = async (items: ReorderItem[]) => {
    await reorder(items);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Projects
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800">Kanban Board</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="p-6">
        <form onSubmit={createTask} className="flex gap-3 mb-6 max-w-lg">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task…"
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Adding…' : 'Add Task'}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading tasks…</p>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onReorder={handleReorder}
            onTaskClick={handleTaskClick}
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
    </div>
  );
}
