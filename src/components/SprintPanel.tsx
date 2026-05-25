'use client';

import React, { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Sprint } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-600',
};

export default function SprintPanel({ workspaceId, projectId, onClose }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const fetchSprints = useCallback(() => {
    api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(r.data));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchSprints(); }, [fetchSprints]);

  const createSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/sprints`, {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      setForm({ name: '', goal: '', start_date: '', end_date: '' });
      setCreating(false);
      fetchSprints();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (sprintId: string, status: Sprint['status']) => {
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}`, { status });
    fetchSprints();
  };

  const deleteSprint = async (sprintId: string) => {
    if (!confirm('Delete this sprint? Tasks will move to backlog.')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}`);
    fetchSprints();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Sprints</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">×</button>
        </div>

        {/* Sprint list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sprints.length === 0 && !creating && (
            <p className="text-sm text-gray-400 text-center py-8">No sprints yet.</p>
          )}

          {sprints.map((sprint) => (
            <div key={sprint.id} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{sprint.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${STATUS_BADGE[sprint.status]}`}>
                  {sprint.status}
                </span>
              </div>

              {sprint.goal && <p className="text-xs text-gray-500">{sprint.goal}</p>}

              <div className="flex items-center gap-3 text-xs text-gray-400">
                {sprint.start_date && <span>{new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                {sprint.start_date && sprint.end_date && <span>→</span>}
                {sprint.end_date && <span>{new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </div>

              {sprint.tasks_count != null && sprint.tasks_count > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                    <span>{sprint.done_count ?? 0}/{sprint.tasks_count} done</span>
                    <span>{sprint.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${sprint.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {sprint.status === 'planning' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(sprint.id, 'active')}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Start Sprint
                  </button>
                )}
                {sprint.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(sprint.id, 'completed')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Complete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteSprint(sprint.id)}
                  className="text-xs text-red-400 hover:text-red-600 ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create sprint form */}
        <div className="border-t p-4">
          {creating ? (
            <form onSubmit={createSprint} className="space-y-3">
              <p className="text-sm font-medium text-gray-700">New Sprint</p>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sprint name (e.g. Sprint 1)"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <textarea
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="Sprint goal (optional)"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sp-start" className="text-xs text-gray-400 mb-0.5 block">Start</label>
                  <input
                    id="sp-start"
                    type="date"
                    title="Sprint start date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="sp-end" className="text-xs text-gray-400 mb-0.5 block">End</label>
                  <input
                    id="sp-end"
                    type="date"
                    title="Sprint end date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {saving ? 'Creating…' : 'Create'}
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
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg py-2.5 hover:bg-blue-50 transition-colors font-medium"
            >
              + New Sprint
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
