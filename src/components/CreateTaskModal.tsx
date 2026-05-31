'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Label, Milestone, Sprint, TaskTemplate, WorkspaceMember } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  defaultDueDate?: string;
  /** Pre-select this status column when opening from a Kanban column header */
  defaultStatusId?: string;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateTaskModal({ workspaceId, projectId, defaultDueDate, defaultStatusId, onClose, onCreate }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: defaultDueDate ?? '',
    started_at: '',
    estimate: '',
    status_id: defaultStatusId ?? '',
    milestone_id: '',
    sprint_id: '',
  });

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`).catch(() => ({ data: [] as WorkspaceMember[] })),
      api.get<Label[]>(`/workspaces/${workspaceId}/labels`).catch(() => ({ data: [] as Label[] })),
      api.get<Milestone[]>(`/workspaces/${workspaceId}/projects/${projectId}/milestones`).catch(() => ({ data: [] as Milestone[] })),
      api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`).catch(() => ({ data: [] as Sprint[] })),
      api.get<TaskTemplate[]>(`/workspaces/${workspaceId}/projects/${projectId}/templates`).catch(() => ({ data: [] as TaskTemplate[] })),
    ]).then(([m, l, ms, sp, tpl]) => {
      setMembers(m.data);
      setAllLabels(l.data);
      setMilestones(ms.data);
      setSprints(sp.data);
      setTemplates(tpl.data);
    });
  }, [workspaceId, projectId]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      title: tpl.default_title ?? f.title,
      description: tpl.description ?? f.description,
      priority: tpl.priority ?? f.priority,
      estimate: tpl.estimate != null ? String(tpl.estimate) : f.estimate,
    }));
    if (tpl.label_ids?.length) setLabelIds(tpl.label_ids);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        ...form,
        estimate: form.estimate !== '' ? Number(form.estimate) : null,
        milestone_id: form.milestone_id || null,
        sprint_id: form.sprint_id || null,
        due_date: form.due_date || null,
        started_at: form.started_at || null,
        assignee_ids: assigneeIds,
        label_ids: labelIds,
        template_id: selectedTemplateId || null,
      });
      onCreate();
      onClose();
    } catch {
      setError('Failed to create task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-16"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">New Task</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1" aria-label="Close">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label htmlFor="ct-template" className="block text-xs text-gray-500 font-medium mb-1">Use template (optional)</label>
              <select
                id="ct-template"
                title="Task template"
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— No template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="ct-title" className="block text-xs text-gray-500 font-medium mb-1">Title *</label>
            <input
              id="ct-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task title"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="ct-desc" className="block text-xs text-gray-500 font-medium mb-1">Description</label>
            <textarea
              id="ct-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Optional description…"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Row: Priority + Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ct-priority" className="block text-xs text-gray-500 font-medium mb-1">Priority</label>
              <select
                id="ct-priority"
                title="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="ct-estimate" className="block text-xs text-gray-500 font-medium mb-1">Story Points</label>
              <input
                id="ct-estimate"
                type="number"
                min="0"
                max="9999"
                value={form.estimate}
                onChange={(e) => setForm({ ...form, estimate: e.target.value })}
                placeholder="—"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row: Start Date + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ct-start" className="block text-xs text-gray-500 font-medium mb-1">Start Date</label>
              <input
                id="ct-start"
                type="date"
                title="Start date"
                value={form.started_at}
                onChange={(e) => setForm({ ...form, started_at: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="ct-due" className="block text-xs text-gray-500 font-medium mb-1">Due Date</label>
              <input
                id="ct-due"
                type="date"
                title="Due date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row: Milestone + Sprint */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ct-milestone" className="block text-xs text-gray-500 font-medium mb-1">Milestone</label>
              <select
                id="ct-milestone"
                title="Milestone"
                value={form.milestone_id}
                onChange={(e) => setForm({ ...form, milestone_id: e.target.value })}
                className="w-full border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">None</option>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ct-sprint" className="block text-xs text-gray-500 font-medium mb-1">Sprint</label>
              <select
                id="ct-sprint"
                title="Sprint"
                value={form.sprint_id}
                onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}
                className="w-full border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Backlog</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1.5">Assignees</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold ${active ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {m.name[0].toUpperCase()}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labels */}
          {allLabels.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1.5">Labels</p>
              <div className="flex flex-wrap gap-2">
                {allLabels.map((l) => {
                  const active = labelIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel(l.id)}
                      style={active ? { backgroundColor: l.color, borderColor: l.color, color: '#fff' } : { borderColor: l.color + '66', color: l.color }}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${!active ? 'bg-white' : ''}`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
