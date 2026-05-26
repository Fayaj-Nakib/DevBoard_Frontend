'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import type {
  ProjectStatus, TaskTemplate, AutomationRule, AutomationTriggerType, AutomationActionType,
  ProjectMember, ProjectRole, WorkspaceMember, CustomFieldDefinition, CustomFieldType,
  ImportJob,
} from '@/types';

type Tab = 'statuses' | 'templates' | 'automation' | 'members' | 'custom-fields' | 'export';

export default function ProjectSettingsPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('statuses');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'statuses', label: 'Board Statuses' },
    { key: 'templates', label: 'Task Templates' },
    { key: 'automation', label: 'Automation' },
    { key: 'members', label: 'Members' },
    { key: 'custom-fields', label: 'Custom Fields' },
    { key: 'export', label: 'Export / Import' },
  ];

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
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                tab === t.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'statuses'      && <StatusManager workspaceId={workspaceId} projectId={projectId} />}
        {tab === 'templates'     && <TemplateManager workspaceId={workspaceId} projectId={projectId} />}
        {tab === 'automation'    && <AutomationRulesManager workspaceId={workspaceId} projectId={projectId} />}
        {tab === 'members'       && <MembersManager workspaceId={workspaceId} projectId={projectId} />}
        {tab === 'custom-fields' && <CustomFieldsManager workspaceId={workspaceId} projectId={projectId} />}
        {tab === 'export'        && <ExportImportManager workspaceId={workspaceId} projectId={projectId} />}
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
                <input title="Status color" type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                <input title="Status name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => saveEdit(s.id)} disabled={saving} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-sm font-medium text-gray-700">{s.name}</span>
                {s.is_default && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">default</span>}
                {s.is_done && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">done</span>}
                <button type="button" onClick={() => { setEditingId(s.id); setEditName(s.name); setEditColor(s.color); }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                {!s.is_default && (
                  <button type="button" onClick={() => deleteStatus(s.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
        <input title="New status color" type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0" />
        <input title="New status name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New status name…" className="flex-1 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => e.key === 'Enter' && addStatus()} />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
          <input title="Mark as done" type="checkbox" checked={newIsDone} onChange={(e) => setNewIsDone(e.target.checked)} className="rounded" />
          Done column
        </label>
        <button type="button" onClick={addStatus} disabled={saving || !newName.trim()} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 flex-shrink-0">Add</button>
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
    api.get<TaskTemplate[]>(`/workspaces/${workspaceId}/projects/${projectId}/templates`)
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
        <button type="button" onClick={() => setShowForm(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ New Template</button>
      </div>

      {templates.length === 0 && !showForm && <p className="text-sm text-gray-400 py-4 text-center">No templates yet.</p>}

      {showForm && (
        <TemplateForm workspaceId={workspaceId} projectId={projectId} onSave={() => { setShowForm(false); fetchTemplates(); }} onCancel={() => setShowForm(false)} />
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{t.name}</p>
              {t.default_title && <p className="text-xs text-gray-400 truncate">Title: {t.default_title}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{t.priority}</span>
            {t.estimate != null && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t.estimate}pt</span>}
            <button type="button" onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateForm({ workspaceId, projectId, onSave, onCancel }: { workspaceId: string; projectId: string; onSave: () => void; onCancel: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', default_title: '', description: '', priority: 'medium' as TaskTemplate['priority'], estimate: '' });

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
    } finally { setSaving(false); }
  };

  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">New Template</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Template name *</label>
          <input ref={nameRef} title="Template name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bug Report" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Default task title</label>
          <input title="Default task title" type="text" value={form.default_title} onChange={(e) => set('default_title', e.target.value)} placeholder="Leave blank to prompt user" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Priority</label>
          <select title="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Story points</label>
          <input title="Story points" type="number" min="0" max="9999" value={form.estimate} onChange={(e) => set('estimate', e.target.value)} placeholder="Optional" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Default description</label>
        <textarea title="Default description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Optional…" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
        <button type="button" onClick={save} disabled={saving || !form.name.trim()} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Template'}</button>
      </div>
    </div>
  );
}

// ── Automation Rules Manager ──────────────────────────────────────────────────

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string }[] = [
  { value: 'task_created',    label: 'Task created' },
  { value: 'status_changed',  label: 'Status changed' },
  { value: 'due_date_reached', label: 'Due date reached' },
  { value: 'assignee_added',  label: 'Assignee added' },
  { value: 'comment_added',   label: 'Comment added' },
];

const ACTION_OPTIONS: { value: AutomationActionType; label: string }[] = [
  { value: 'change_status',     label: 'Change status' },
  { value: 'assign_user',       label: 'Assign user' },
  { value: 'add_label',         label: 'Add label' },
  { value: 'post_comment',      label: 'Post comment' },
  { value: 'send_notification', label: 'Send notification' },
];

function AutomationRulesManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_type: 'task_created' as AutomationTriggerType, action_type: 'change_status' as AutomationActionType, action_value: '' });

  const fetchRules = useCallback(() => {
    api.get<AutomationRule[]>(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules`)
      .then((r) => setRules(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules`, {
        name: form.name.trim(), trigger_type: form.trigger_type, action_type: form.action_type,
        action_config: form.action_value ? { value: form.action_value } : null,
      });
      setForm({ name: '', trigger_type: 'task_created', action_type: 'change_status', action_value: '' });
      setShowForm(false);
      fetchRules();
    } finally { setSaving(false); }
  };

  const toggleActive = async (rule: AutomationRule) => {
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules/${rule.id}`, { is_active: !rule.is_active });
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this automation rule?')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules/${id}`);
    fetchRules();
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Automation Rules</h2>
          <p className="text-xs text-gray-500">Trigger actions automatically when events occur.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ New Rule</button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Automation Rule</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Rule name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Notify on status change" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">When (trigger)</label>
              <select title="Trigger type" value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value as AutomationTriggerType })} className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Then (action)</label>
              <select title="Action type" value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value as AutomationActionType })} className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Action value</label>
            <input type="text" value={form.action_value} onChange={(e) => setForm({ ...form, action_value: e.target.value })} placeholder="Optional — depends on action type" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
            <button type="button" onClick={save} disabled={saving || !form.name.trim()} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Create Rule'}</button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm && <p className="text-sm text-gray-400 py-4 text-center">No automation rules yet.</p>}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => toggleActive(rule)} title={rule.is_active ? 'Disable' : 'Enable'} className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${rule.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{rule.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                When <span className="text-gray-600">{TRIGGER_OPTIONS.find((t) => t.value === rule.trigger_type)?.label ?? rule.trigger_type}</span>
                {' → '}
                <span className="text-gray-600">{ACTION_OPTIONS.find((a) => a.value === rule.action_type)?.label ?? rule.action_type}</span>
              </p>
            </div>
            {rule.last_triggered && <span className="text-xs text-gray-400 flex-shrink-0">Last: {new Date(rule.last_triggered).toLocaleDateString()}</span>}
            {rule.last_result && <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${rule.last_result === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{rule.last_result}</span>}
            <button type="button" onClick={() => deleteRule(rule.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Members Manager ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ProjectRole, string> = { viewer: 'Viewer', editor: 'Editor', manager: 'Manager' };
const ROLE_COLORS: Record<ProjectRole, string> = {
  viewer: 'bg-gray-100 text-gray-600',
  editor: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
};

function MembersManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<ProjectRole>('editor');

  const fetch = useCallback(() => {
    Promise.all([
      api.get<ProjectMember[]>(`/workspaces/${workspaceId}/projects/${projectId}/members`),
      api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    ]).then(([m, wm]) => {
      setMembers(m.data);
      setWsMembers(wm.data);
    }).finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addMember = async () => {
    if (!addUserId) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/members`, { user_id: addUserId, role: addRole });
      setAddUserId('');
      fetch();
    } finally { setSaving(false); }
  };

  const changeRole = async (userId: string, role: ProjectRole) => {
    await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`, { role });
    fetch();
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`);
    fetch();
  };

  const memberIds = new Set(members.map((m) => m.user.id));
  const inviteable = wsMembers.filter((m) => !memberIds.has(m.id));

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Project Members</h2>
        <p className="text-xs text-gray-500 mb-4">Control per-project access. Workspace owners and admins always have full access.</p>
      </div>

      {/* Add member */}
      <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
        <select
          title="Workspace member to add"
          value={addUserId}
          onChange={(e) => setAddUserId(e.target.value)}
          className="flex-1 border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select workspace member…</option>
          {inviteable.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
          ))}
        </select>
        <select
          title="Role"
          value={addRole}
          onChange={(e) => setAddRole(e.target.value as ProjectRole)}
          className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="manager">Manager</option>
        </select>
        <button
          type="button"
          onClick={addMember}
          disabled={saving || !addUserId}
          className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
        >
          Add
        </button>
      </div>

      {members.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No explicit project members yet.</p>}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.user.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {m.user.name[0].toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{m.user.name}</p>
              <p className="text-xs text-gray-400">{m.user.email}</p>
            </div>
            <select
              title="Member role"
              value={m.role}
              onChange={(e) => changeRole(m.user.id, e.target.value as ProjectRole)}
              className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 outline-none cursor-pointer ${ROLE_COLORS[m.role]}`}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="manager">Manager</option>
            </select>
            <button type="button" onClick={() => removeMember(m.user.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
        <p><span className="font-medium text-gray-700">Viewer</span> — read-only access to tasks and board</p>
        <p><span className="font-medium text-gray-700">Editor</span> — can create and edit tasks</p>
        <p><span className="font-medium text-gray-700">Manager</span> — full project access, can manage members and settings</p>
      </div>
    </div>
  );
}

// ── Custom Fields Manager ─────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text', number: 'Number', date: 'Date', select: 'Select', url: 'URL', checkbox: 'Checkbox',
};

function CustomFieldsManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', field_type: 'text' as CustomFieldType, options: '', is_required: false });

  const fetch = useCallback(() => {
    api.get<CustomFieldDefinition[]>(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`)
      .then((r) => setFields(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addField = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`, {
        name: form.name.trim(),
        field_type: form.field_type,
        options: form.field_type === 'select' ? form.options.split(',').map((s) => s.trim()).filter(Boolean) : null,
        is_required: form.is_required,
      });
      setForm({ name: '', field_type: 'text', options: '', is_required: false });
      setShowForm(false);
      fetch();
    } finally { setSaving(false); }
  };

  const deleteField = async (id: string) => {
    if (!confirm('Delete this custom field? All task values will be removed.')) return;
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields/${id}`);
    fetch();
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Custom Fields</h2>
          <p className="text-xs text-gray-500">Add extra data fields to tasks in this project.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Add Field</button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Custom Field</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Field name *</label>
              <input
                type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Story URL" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Field type</label>
              <select
                title="Field type" value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value as CustomFieldType })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                  <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          {form.field_type === 'select' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Options (comma-separated)</label>
              <input
                type="text" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                placeholder="Option A, Option B, Option C" className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="rounded" />
            Required field
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
            <button type="button" onClick={addField} disabled={saving || !form.name.trim()} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Add Field'}</button>
          </div>
        </div>
      )}

      {fields.length === 0 && !showForm && <p className="text-sm text-gray-400 py-4 text-center">No custom fields yet.</p>}

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{f.name}</p>
              {f.options && f.options.length > 0 && (
                <p className="text-xs text-gray-400 truncate">{f.options.join(', ')}</p>
              )}
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{FIELD_TYPE_LABELS[f.field_type]}</span>
            {f.is_required && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">required</span>}
            <button type="button" onClick={() => deleteField(f.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export / Import Manager ───────────────────────────────────────────────────

function ExportImportManager({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const url = `/api/workspaces/${workspaceId}/projects/${projectId}/export?format=${exportFormat}`;
    const a = document.createElement('a');
    a.href = url;
    // Trigger download via fetch to include auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `project-export.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('format', importFormat);
      const { data } = await api.post<{ job_id: string }>(`/workspaces/${workspaceId}/projects/${projectId}/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportJob({ id: data.job_id, status: 'pending', format: importFormat, tasks_created: null, error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      // Poll for status
      pollRef.current = setInterval(async () => {
        const r = await api.get<ImportJob>(`/import-jobs/${data.job_id}`);
        setImportJob(r.data);
        if (r.data.status === 'completed' || r.data.status === 'failed') {
          clearInterval(pollRef.current!);
        }
      }, 2000);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Export Project</h2>
        <p className="text-xs text-gray-500 mb-4">Download all project data including tasks, statuses, milestones, and sprints.</p>
        <div className="flex items-center gap-3">
          <select
            title="Export format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="json">JSON (full data)</option>
            <option value="csv">CSV (tasks only)</option>
          </select>
          <button type="button" onClick={handleExport} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Download Export
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Import Tasks</h2>
        <p className="text-xs text-gray-500 mb-4">Upload a JSON or CSV file exported from DevBoard. Existing tasks will not be affected.</p>
        <div className="flex items-center gap-3">
          <select
            title="Import format"
            value={importFormat}
            onChange={(e) => setImportFormat(e.target.value as 'json' | 'csv')}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <label className={`text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors ${importing ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {importing ? 'Uploading…' : 'Choose File & Import'}
            <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" disabled={importing} onChange={handleImport} />
          </label>
        </div>

        {importJob && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            importJob.status === 'completed' ? 'bg-green-50 text-green-700' :
            importJob.status === 'failed'    ? 'bg-red-50 text-red-600' :
            'bg-blue-50 text-blue-700'
          }`}>
            {importJob.status === 'pending'    && 'Import queued…'}
            {importJob.status === 'processing' && 'Importing tasks…'}
            {importJob.status === 'completed'  && `Import complete — ${importJob.tasks_created ?? 0} tasks created.`}
            {importJob.status === 'failed'     && `Import failed: ${importJob.error_message ?? 'Unknown error'}`}
          </div>
        )}
      </div>
    </div>
  );
}
