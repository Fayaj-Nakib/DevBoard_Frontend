'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import NotificationsBell from '@/components/NotificationsBell';
import type { Label } from '@/types';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6B7280',
];

export default function LabelsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { logout, user } = useAuth();

  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', color: '#6366f1' });
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '' });

  const fetchLabels = useCallback(() => {
    api.get<Label[]>(`/workspaces/${workspaceId}/labels`)
      .then((r) => setLabels(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const createLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreateSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/labels`, createForm);
      setCreateForm({ name: '', color: '#6366f1' });
      setCreating(false);
      fetchLabels();
    } finally {
      setCreateSaving(false);
    }
  };

  const saveEdit = async (labelId: string) => {
    await api.patch(`/workspaces/${workspaceId}/labels/${labelId}`, editForm);
    setEditingId(null);
    fetchLabels();
  };

  const deleteLabel = async (labelId: string) => {
    if (!confirm('Delete this label? It will be removed from all tasks.')) return;
    await api.delete(`/workspaces/${workspaceId}/labels/${labelId}`);
    fetchLabels();
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditForm({ name: label.name, color: label.color });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← Back
          </button>
          <span className="text-gray-200 text-lg">/</span>
          <h1 className="text-sm font-semibold text-gray-800">Labels</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
          <button type="button" onClick={logout} className="text-sm text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Workspace Labels</h2>
            <p className="text-sm text-gray-500 mt-0.5">Labels are shared across all projects in this workspace.</p>
          </div>
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Label
            </button>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <div className="bg-white border rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">New Label</p>
            <form onSubmit={createLabel} className="space-y-3">
              <div className="flex gap-3">
                {/* Color picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                    title="Label color"
                    className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                  />
                </div>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Label name"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Preset colors */}
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, color: c })}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${createForm.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              {/* Preview */}
              {createForm.name && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">Preview:</p>
                  <span
                    style={{ backgroundColor: createForm.color + '22', color: createForm.color, borderColor: createForm.color + '44' }}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium"
                  >
                    {createForm.name}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createSaving || !createForm.name.trim()}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {createSaving ? 'Creating…' : 'Create Label'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Labels list */}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading labels…</p>
        ) : labels.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No labels yet.</p>
            <p className="text-gray-400 text-xs mt-1">Create your first label to organize tasks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.map((label) => (
              <div key={label.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-4">
                {editingId === label.id ? (
                  <>
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      title="Label color"
                      className="w-8 h-8 rounded border cursor-pointer p-0.5 flex-shrink-0"
                    />
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(label.id)}
                      className="text-sm text-blue-600 font-medium hover:text-blue-800"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span
                      style={{ backgroundColor: label.color + '22', color: label.color, borderColor: label.color + '44' }}
                      className="text-sm px-2.5 py-0.5 rounded-full border font-medium"
                    >
                      {label.name}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{label.color}</span>
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(label)}
                        className="text-xs text-gray-400 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLabel(label.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
