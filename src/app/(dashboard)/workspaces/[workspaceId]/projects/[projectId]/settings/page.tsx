'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { ProjectStatus, TaskTemplate } from '@/types';

export default function ProjectSettingsPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<'statuses' | 'templates'>('statuses');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}`)}
          className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1"
        >
          ← Board
        </button>
        <span className="text-gray-200 text-lg">/</span>
        <h1 className="text-sm font-semibold text-gray-800">Project Settings</h1>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('statuses')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'statuses' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Board Statuses
          </button>
          <button
            type="button"
            onClick={() => setTab('templates')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'templates' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Task Templates
          </button>
        </div>

        {tab === 'statuses' && (
          <StatusManager workspaceId={workspaceId} projectId={projectId} />
        )}
        {tab === 'templates' && (
          <TemplateManager workspaceId={workspaceId} projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// ── Status Manager ────────────────────────────────────────────────────────────

function StatusManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [newIsDone, setNewIsDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const fetchStatuses = useCallback(() => {
    api
      .get<ProjectStatus[]>(`/workspaces/${workspaceId}/projects/${projectId}/statuses`)
      .then((r) => setStatuses(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const addStatus = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/statuses`, {
        name: newName.trim(),
        color: newColor,
        is_done: newIsDone,
      });
      setNewName('');
      setNewColor('#6366F1');
      setNewIsDone(false);
      fetchStatuses();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/statuses/${id}`, {
        name: editName,
        color: editColor,
      });
      setEditingId(null);
      fetchStatuses();
    } finally {
      setSaving(false);
    }
  };

  const deleteStatus = async (id: string) => {
    if (!confirm('Delete this status? Tasks in it will move to "To Do".')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/statuses/${id}`);
    fetchStatuses();
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Board Columns</h2>
        <p className="text-xs text-gray-500 mb-4">Customize the columns on your kanban board. Default columns cannot be deleted.</p>
      </div>

      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            {editingId === s.id ? (
              <>
                <input
                  title="Status color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
                <input
                  title="Status name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(s.id)}
                  disabled={saving}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 text-sm font-medium text-gray-700">{s.name}</span>
                {s.is_default && (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">default</span>
                )}
                {s.is_done && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">done</span>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingId(s.id); setEditName(s.name); setEditColor(s.color); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Edit
                </button>
                {!s.is_default && (
                  <button
                    type="button"
                    onClick={() => deleteStatus(s.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new status */}
      <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
        <input
          title="New status color"
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0"
        />
        <input
          title="New status name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New status name…"
          className="flex-1 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && addStatus()}
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
          <input
            title="Mark as done"
            type="checkbox"
            checked={newIsDone}
            onChange={(e) => setNewIsDone(e.target.checked)}
            className="rounded"
          />
          Done column
        </label>
        <button
          type="button"
          onClick={addStatus}
          disabled={saving || !newName.trim()}
          className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Template Manager ──────────────────────────────────────────────────────────

function TemplateManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTemplates = useCallback(() => {
    api
      .get<TaskTemplate[]>(`/workspaces/${workspaceId}/projects/${projectId}/templates`)
      .then((r) => setTemplates(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/templates/${id}`);
    fetchTemplates();
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Task Templates</h2>
          <p className="text-xs text-gray-500">Pre-fill new tasks with default values.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          + New Template
        </button>
      </div>

      {templates.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 py-4 text-center">No templates yet.</p>
      )}

      {showForm && (
        <TemplateForm
          workspaceId={workspaceId}
          projectId={projectId}
          onSave={() => { setShowForm(false); fetchTemplates(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{t.name}</p>
              {t.default_title && (
                <p className="text-xs text-gray-400 truncate">Title: {t.default_title}</p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
              ${t.priority === 'high' ? 'bg-red-100 text-red-600' :
                t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'}`}
            >
              {t.priority}
            </span>
            {t.estimate != null && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t.estimate}pt</span>
            )}
            <button
              type="button"
              onClick={() => deleteTemplate(t.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateForm({
  workspaceId, projectId, onSave, onCancel,
}: {
  workspaceId: string; projectId: string; onSave: () => void; onCancel: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    default_title: '',
    description: '',
    priority: 'medium' as TaskTemplate['priority'],
    estimate: '',
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/templates`, {
        name: form.name.trim(),
        default_title: form.default_title.trim() || null,
        description: form.description.trim() || null,
        priority: form.priority,
        estimate: form.estimate ? Number(form.estimate) : null,
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">New Template</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Template name *</label>
          <input
            ref={nameRef}
            title="Template name"
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Bug Report"
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Default task title</label>
          <input
            title="Default task title"
            type="text"
            value={form.default_title}
            onChange={(e) => set('default_title', e.target.value)}
            placeholder="Leave blank to prompt user"
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Priority</label>
          <select
            title="Priority"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Story points</label>
          <input
            title="Story points"
            type="number"
            min="0"
            max="9999"
            value={form.estimate}
            onChange={(e) => set('estimate', e.target.value)}
            placeholder="Optional"
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Default description</label>
        <textarea
          title="Default description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          placeholder="Optional…"
          className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}
