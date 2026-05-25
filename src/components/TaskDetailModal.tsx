'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type {
  Task,
  Comment,
  Label,
  Milestone,
  Sprint,
  WorkspaceMember,
} from '@/types';

interface Props {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};
const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-xs';
  return (
    <span
      className={`${cls} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0`}
      title={name}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

function FileIcon({ mime }: { mime?: string }) {
  if (mime?.startsWith('image/')) return <span>🖼</span>;
  if (mime === 'application/pdf') return <span>📄</span>;
  return <span>📎</span>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ActiveTab = 'subtasks' | 'attachments';

export default function TaskDetailModal({ taskId, workspaceId, projectId, onClose, onUpdate }: Props) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('subtasks');

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    started_at: '',
    estimate: '',
    milestone_id: '',
    sprint_id: '',
  });

  // Sidebar data
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  // Watchers
  const [isWatching, setIsWatching] = useState(false);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Subtasks
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Pickers
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const fetchTask = useCallback(() => {
    api.get<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => {
        const t = r.data;
        setTask(t);
        setForm({
          title: t.title,
          description: t.description ?? '',
          priority: t.priority,
          status: t.status,
          due_date: t.due_date ? t.due_date.substring(0, 10) : '',
          started_at: t.started_at ? t.started_at.substring(0, 10) : '',
          estimate: t.estimate != null ? String(t.estimate) : '',
          milestone_id: t.milestone_id ?? '',
          sprint_id: t.sprint_id ?? '',
        });
        setIsWatching(!!t.watchers?.some((w) => w.id === user?.id));
      });
  }, [taskId, workspaceId, projectId, user?.id]);

  useEffect(() => {
    fetchTask();
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`).then((r) => setMembers(r.data));
    api.get<Label[]>(`/workspaces/${workspaceId}/labels`).then((r) => setAllLabels(r.data));
    api.get<Milestone[]>(`/workspaces/${workspaceId}/projects/${projectId}/milestones`).then((r) => setMilestones(r.data));
    api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`).then((r) => setSprints(r.data));
  }, [taskId, workspaceId, projectId, fetchTask]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {
        ...form,
        estimate: form.estimate !== '' ? Number(form.estimate) : null,
        milestone_id: form.milestone_id || null,
        sprint_id: form.sprint_id || null,
        due_date: form.due_date || null,
        started_at: form.started_at || null,
      });
      setEditing(false);
      fetchTask();
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = async (memberId: string) => {
    if (!task) return;
    const current = task.assignees.map((a) => a.id);
    const next = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId];
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {
      assignee_ids: next,
    });
    fetchTask();
    onUpdate();
  };

  const toggleLabel = async (labelId: string) => {
    if (!task) return;
    const hasIt = task.labels.some((l) => l.id === labelId);
    if (hasIt) {
      await api.delete(`/tasks/${taskId}/labels/${labelId}`);
    } else {
      await api.post(`/tasks/${taskId}/labels/${labelId}`);
    }
    fetchTask();
    onUpdate();
  };

  const toggleWatch = async () => {
    if (isWatching) {
      await api.delete(`/tasks/${taskId}/watch`);
    } else {
      await api.post(`/tasks/${taskId}/watch`);
    }
    setIsWatching(!isWatching);
    fetchTask();
  };

  const addComment = async (e: React.FormEvent) => {
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

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks`, {
        title: newSubtask,
        priority: 'medium',
      });
      setNewSubtask('');
      fetchTask();
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: Task) => {
    const nextStatus = subtask.status === 'done' ? 'todo' : 'done';
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${subtask.id}`, {
      status: nextStatus,
    });
    fetchTask();
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/tasks/${taskId}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchTask();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    fetchTask();
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-10 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  const subtasks = task.children ?? [];
  const doneSubs = subtasks.filter((s) => s.status === 'done').length;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto"
      onClick={handleBackdrop}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-6 py-4 border-b">
          {editing ? (
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              title="Task title"
              placeholder="Task title"
              className="flex-1 text-lg font-semibold text-gray-800 border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h2 className="flex-1 text-lg font-semibold text-gray-800 leading-snug">{task.title}</h2>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Watch button */}
            <button
              type="button"
              onClick={toggleWatch}
              title={isWatching ? 'Stop watching' : 'Watch task'}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                isWatching
                  ? 'border-blue-300 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {isWatching ? '👁 Watching' : '👁 Watch'}
            </button>

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
                  onClick={() => { setEditing(false); fetchTask(); }}
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

        {/* ── Two-column body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: main content ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r">
            {/* Description */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Description</p>
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
                <p className="text-sm text-gray-400 italic">No description.</p>
              )}
            </div>

            {/* Tabs: Sub-tasks / Attachments */}
            <div>
              <div className="flex gap-1 border-b mb-4">
                {(['subtasks', 'attachments'] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'subtasks'
                      ? `Sub-tasks${subtasks.length > 0 ? ` (${doneSubs}/${subtasks.length})` : ''}`
                      : `Attachments${task.attachments?.length ? ` (${task.attachments.length})` : ''}`}
                  </button>
                ))}
              </div>

              {activeTab === 'subtasks' && (
                <div className="space-y-2">
                  {subtasks.length > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{doneSubs}/{subtasks.length} done</span>
                        <span>{subtasks.length > 0 ? Math.round((doneSubs / subtasks.length) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${subtasks.length > 0 ? (doneSubs / subtasks.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSubtask(sub)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          sub.status === 'done'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {sub.status === 'done' && <span className="text-xs leading-none">✓</span>}
                      </button>
                      <span className={`text-sm flex-1 ${sub.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {sub.title}
                      </span>
                      {sub.assignees?.length > 0 && (
                        <div className="flex -space-x-1">
                          {sub.assignees.slice(0, 3).map((a) => (
                            <Avatar key={a.id} name={a.name} size="sm" />
                          ))}
                        </div>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[sub.priority] ?? ''}`}>
                        {sub.priority}
                      </span>
                    </div>
                  ))}

                  <form onSubmit={addSubtask} className="flex gap-2 mt-3">
                    <input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Add a sub-task…"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={addingSubtask || !newSubtask.trim()}
                      className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      {addingSubtask ? '…' : '+ Add'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-2">
                  {(task.attachments ?? []).map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                      <FileIcon mime={att.mime_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{att.original_name}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(att.size)} · {att.uploader?.name ?? '—'}
                        </p>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Open
                      </a>
                      {(user?.id === att.uploaded_by) && (
                        <button
                          type="button"
                          onClick={() => deleteAttachment(att.id)}
                          className="text-xs text-red-400 hover:text-red-600 ml-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {(task.attachments ?? []).length === 0 && (
                    <p className="text-sm text-gray-400 italic">No attachments yet.</p>
                  )}

                  <div className="pt-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={uploadFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-sm border border-dashed border-gray-300 rounded-lg px-4 py-2.5 w-full text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : '+ Attach a file'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Comments ({task.comments?.length ?? 0})
              </p>

              <div className="space-y-3 mb-4">
                {(task.comments ?? []).map((comment: Comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar name={comment.user.name} />
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{comment.user.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  </div>
                ))}
                {(task.comments ?? []).length === 0 && (
                  <p className="text-sm text-gray-400 italic">No comments yet.</p>
                )}
              </div>

              <form onSubmit={addComment} className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment… (use @name to mention)"
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

          {/* ── Right sidebar: metadata ── */}
          <div className="w-64 flex-shrink-0 overflow-y-auto p-4 space-y-5 bg-gray-50">
            {/* Status */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Status</p>
              {editing ? (
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  title="Task status"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              ) : (
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Priority</p>
              {editing ? (
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  title="Task priority"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              )}
            </div>

            {/* Estimate */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Story Points</p>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={form.estimate}
                  onChange={(e) => setForm({ ...form, estimate: e.target.value })}
                  title="Story points"
                  placeholder="—"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-700">{task.estimate ?? '—'}</p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Start Date</p>
              {editing ? (
                <input
                  type="date"
                  value={form.started_at}
                  onChange={(e) => setForm({ ...form, started_at: e.target.value })}
                  title="Start date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-700">
                  {task.started_at ? new Date(task.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Due Date</p>
              {editing ? (
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  title="Due date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-700">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
              )}
            </div>

            {/* Milestone */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Milestone</p>
              {editing ? (
                <select
                  value={form.milestone_id}
                  onChange={(e) => setForm({ ...form, milestone_id: e.target.value })}
                  title="Milestone"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-700">{task.milestone?.name ?? '—'}</p>
              )}
            </div>

            {/* Sprint */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Sprint</p>
              {editing ? (
                <select
                  value={form.sprint_id}
                  onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}
                  title="Sprint"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-700">{task.sprint?.name ?? 'Backlog'}</p>
              )}
            </div>

            <hr className="border-gray-200" />

            {/* Assignees */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-400 uppercase font-medium">Assignees</p>
                <button
                  type="button"
                  onClick={() => { setShowAssigneePicker(!showAssigneePicker); setShowLabelPicker(false); }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>

              {task.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5 bg-white border rounded-full pl-1 pr-2.5 py-0.5">
                      <Avatar name={a.name} size="sm" />
                      <span className="text-xs text-gray-600">{a.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Unassigned</p>
              )}

              {showAssigneePicker && (
                <div className="absolute left-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-20 w-full max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const assigned = task.assignees.some((a) => a.id === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssignee(m.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${assigned ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                          {assigned && '✓'}
                        </span>
                        <Avatar name={m.name} size="sm" />
                        <span className="text-gray-700">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-400 uppercase font-medium">Labels</p>
                <button
                  type="button"
                  onClick={() => { setShowLabelPicker(!showLabelPicker); setShowAssigneePicker(false); }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>

              {task.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.labels.map((l) => (
                    <span
                      key={l.id}
                      style={{ backgroundColor: l.color + '22', color: l.color, borderColor: l.color + '44' }}
                      className="text-xs px-2 py-0.5 rounded-full border font-medium"
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No labels</p>
              )}

              {showLabelPicker && (
                <div className="absolute left-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-20 w-full max-h-48 overflow-y-auto">
                  {allLabels.map((label) => {
                    const active = task.labels.some((l) => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${active ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                          {active && '✓'}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-gray-700">{label.name}</span>
                      </button>
                    );
                  })}
                  {allLabels.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">No labels in workspace.</p>
                  )}
                </div>
              )}
            </div>

            {/* Watchers */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Watchers</p>
              {(task.watchers ?? []).length > 0 ? (
                <div className="flex -space-x-1 mb-1">
                  {(task.watchers ?? []).slice(0, 6).map((w) => (
                    <Avatar key={w.id} name={w.name} size="sm" />
                  ))}
                  {(task.watchers ?? []).length > 6 && (
                    <span className="text-xs text-gray-500 ml-2">+{(task.watchers ?? []).length - 6} more</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-1">No watchers</p>
              )}
            </div>

            <hr className="border-gray-200" />

            {/* Creator */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium mb-1.5">Created by</p>
              <p className="text-sm text-gray-700">{task.creator?.name ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
