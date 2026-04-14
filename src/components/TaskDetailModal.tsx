'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Comment {
  id: string;
  body: string;
  user: { id: string; name: string };
  created_at: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date?: string;
  assignee?: { id: string; name: string };
  creator?: { id: string; name: string };
  comments: Comment[];
}

interface Props {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done'];
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export default function TaskDetailModal({
  taskId,
  workspaceId,
  projectId,
  onClose,
  onUpdate,
}: Props) {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
  });
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const fetchTask = () => {
    api
      .get(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => {
        setTask(r.data);
        setForm({
          title: r.data.title,
          description: r.data.description ?? '',
          priority: r.data.priority,
          status: r.data.status,
          due_date: r.data.due_date
            ? new Date(r.data.due_date).toISOString().substring(0, 10)
            : '',
        });
      });
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        form
      );
      setEditing(false);
      fetchTask();
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { body: newComment });
      setNewComment('');
      fetchTask();
    } finally {
      setAddingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    fetchTask();
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-10 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b gap-4">
          {editing ? (
            <input
              aria-label="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-lg font-semibold text-gray-800 border rounded-lg px-3 py-1.5 flex-1 outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h2 className="text-lg font-semibold text-gray-800 flex-1 leading-snug">
              {task.title}
            </h2>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Meta row 1 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-status" className="block text-xs text-gray-400 uppercase font-medium mb-1">
                Status
              </label>
              {editing ? (
                <select
                  id="task-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-700">{STATUS_LABELS[task.status]}</p>
              )}
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-xs text-gray-400 uppercase font-medium mb-1">
                Priority
              </label>
              {editing ? (
                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-700 capitalize">{task.priority}</p>
              )}
            </div>

            <div>
              <label htmlFor="task-due-date" className="block text-xs text-gray-400 uppercase font-medium mb-1">
                Due Date
              </label>
              {editing ? (
                <input
                  id="task-due-date"
                  type="date"
                  title="Due date"
                  aria-label="Due date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-700">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              )}
            </div>
          </div>

          {/* Meta row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-1">
                Assignee
              </label>
              <p className="text-sm text-gray-700">{task.assignee?.name ?? '—'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-1">
                Created by
              </label>
              <p className="text-sm text-gray-700">{task.creator?.name ?? '—'}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 uppercase font-medium mb-1">
              Description
            </label>
            {editing ? (
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Add a description…"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : task.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No description</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Comments ({task.comments.length})
            </h3>

            <div className="space-y-3 mb-4">
              {task.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {comment.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {comment.user.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {user?.id === comment.user.id && (
                          <button
                            type="button"
                            onClick={() => deleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{comment.body}</p>
                  </div>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-sm text-gray-400 italic">No comments yet.</p>
              )}
            </div>

            <form onSubmit={addComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={addingComment || !newComment.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {addingComment ? '…' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
