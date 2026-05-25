'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import KanbanBoard, { ReorderItem } from '@/components/kanban/KanbanBoard';
import TaskDetailModal from '@/components/TaskDetailModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import SprintPanel from '@/components/SprintPanel';
import NotificationsBell from '@/components/NotificationsBell';
import type { Task } from '@/types';

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const { logout, user } = useAuth();

  const { tasks, loading, reorder, refresh } = useTasks(workspaceId, projectId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSprints, setShowSprints] = useState(false);

  const handleReorder = (items: ReorderItem[]) => reorder(items);
  const handleTaskClick = (task: Task) => setSelectedTaskId(task.id);

  const totalTasks = Object.values(tasks).reduce((sum, col) => sum + col.length, 0);
  const doneTasks = tasks['done']?.length ?? 0;

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
          <h1 className="text-sm font-semibold text-gray-800">Board</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress pill */}
          {totalTasks > 0 && (
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

          <NotificationsBell />
          <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-red-400 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Board */}
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1.5"
            >
              + New Task
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-sm">Loading tasks…</p>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onReorder={handleReorder}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Task detail modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={refresh}
        />
      )}

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskModal
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreate={refresh}
        />
      )}

      {/* Sprint panel */}
      {showSprints && (
        <SprintPanel
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowSprints(false)}
        />
      )}
    </div>
  );
}
