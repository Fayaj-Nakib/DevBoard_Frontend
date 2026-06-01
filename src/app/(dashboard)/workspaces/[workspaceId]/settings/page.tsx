'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Webhook, WebhookEvent, WebhookDelivery, TwoFactorStatus, GitHubConnection } from '@/types';

const ALL_EVENTS: WebhookEvent[] = [
  'task.created', 'task.updated', 'task.deleted',
  'task.status_changed', 'comment.created',
  'project.created', 'project.updated',
];

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<'webhooks' | 'profile' | 'security' | 'members' | 'github'>(
    initialTab === 'security' ? 'security'
    : initialTab === 'profile' ? 'profile'
    : initialTab === 'members' ? 'members'
    : initialTab === 'github' ? 'github'
    : 'webhooks'
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Projects
          </button>
          <span className="text-border text-lg">/</span>
          <h1 className="text-sm font-semibold text-foreground">Workspace Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <button type="button" onClick={logout} className="text-sm text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('webhooks')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'webhooks' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Webhooks
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'profile' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'members' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'security' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => setTab('github')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'github' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            GitHub
          </button>
        </div>

        {tab === 'webhooks' && <WebhookManager workspaceId={workspaceId} />}
        {tab === 'profile'  && <UserDigestSettings />}
        {tab === 'members'  && <WorkspaceMembersManager workspaceId={workspaceId} />}
        {tab === 'security' && <SecurityTab workspaceId={workspaceId} />}
        {tab === 'github'   && <GitHubSettings workspaceId={workspaceId} />}
      </div>
    </div>
  );
}

// ── Webhook Manager ───────────────────────────────────────────────────────────

function WebhookManager({ workspaceId }: { workspaceId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    url: '',
    events: [] as WebhookEvent[],
  });

  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get<Webhook[]>(`/workspaces/${workspaceId}/webhooks`)
      .then((r) => setWebhooks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, version]);

  const fetchWebhooks = () => setVersion((v) => v + 1);

  const toggleEvent = (event: WebhookEvent) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/webhooks`, {
        name: form.name.trim(),
        url: form.url.trim(),
        events: form.events,
      });
      setForm({ name: '', url: '', events: [] });
      setShowForm(false);
      fetchWebhooks();
      toast.success('Webhook created');
    } catch {
      toast.error('Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (wh: Webhook) => {
    try {
      await api.patch(`/workspaces/${workspaceId}/webhooks/${wh.id}`, { is_active: !wh.is_active });
      fetchWebhooks();
    } catch {
      toast.error('Failed to update webhook');
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/webhooks/${id}`);
      fetchWebhooks();
      toast.success('Webhook deleted');
    } catch {
      toast.error('Failed to delete webhook');
    }
  };

  const testWebhook = async (id: string) => {
    try {
      await api.post(`/workspaces/${workspaceId}/webhooks/${id}/test`);
      toast.success('Test ping dispatched');
    } catch {
      toast.error('Failed to send test ping');
    }
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Webhooks</h2>
          <p className="text-xs text-muted-foreground">Receive HTTP POST notifications when events occur in this workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          + Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">New Webhook</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Slack notifications"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Endpoint URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Events *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded"
                  />
                  <span className="text-foreground font-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !form.name.trim() || !form.url.trim() || form.events.length === 0}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Webhook'}
            </button>
          </div>
        </div>
      )}

      {webhooks.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-4 text-center">No webhooks configured yet.</p>
      )}

      <div className="space-y-2">
        {webhooks.map((wh) => (
          <div key={wh.id} className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleActive(wh)}
                title={wh.is_active ? 'Disable' : 'Enable'}
                className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${wh.is_active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${wh.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{wh.name}</p>
                <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => testWebhook(wh.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 dark:border-blue-800 rounded px-2 py-0.5"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {expandedId === wh.id ? 'Hide' : 'Deliveries'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteWebhook(wh.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Events chips */}
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {wh.events.map((ev) => (
                <span key={ev} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{ev}</span>
              ))}
            </div>

            {/* Recent deliveries */}
            {expandedId === wh.id && (
              <DeliveryLog workspaceId={''} webhookId={wh.id} deliveries={wh.recent_deliveries ?? []} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryLog({ deliveries, webhookId }: { workspaceId: string; webhookId: string; deliveries: WebhookDelivery[] }) {
  void webhookId;
  if (deliveries.length === 0) {
    return <p className="text-xs text-muted-foreground px-4 pb-3">No recent deliveries.</p>;
  }
  return (
    <div className="border-t divide-y">
      {deliveries.map((d) => (
        <div key={d.id} className="px-4 py-2 flex items-center gap-3 text-xs">
          <span
            className={`w-16 text-center px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              d.response_status && d.response_status < 300
                ? 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400'
                : d.failed_at
                ? 'bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {d.response_status ?? (d.failed_at ? 'failed' : 'pending')}
          </span>
          <span className="font-mono text-muted-foreground flex-1 truncate">{d.event}</span>
          <span className="text-muted-foreground flex-shrink-0">
            {new Date(d.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── User Digest Settings ──────────────────────────────────────────────────────

interface DigestPrefs {
  digest_enabled: boolean;
  digest_hour: number;
}

function UserDigestSettings() {
  const [prefs, setPrefs] = useState<DigestPrefs>({ digest_enabled: true, digest_hour: 7 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<DigestPrefs & { name: string; email: string }>('/auth/me')
      .then((r) => setPrefs({ digest_enabled: r.data.digest_enabled, digest_hour: r.data.digest_hour }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch('/auth/me', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Email Digest</h2>
        <p className="text-xs text-muted-foreground">Receive a daily summary of your tasks and activity.</p>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.digest_enabled}
            onChange={(e) => setPrefs({ ...prefs, digest_enabled: e.target.checked })}
            className="rounded w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Enable daily digest</p>
            <p className="text-xs text-muted-foreground">Get a morning summary of due tasks, overdue items, and recent mentions.</p>
          </div>
        </label>

        {prefs.digest_enabled && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Send digest at (local hour)</label>
            <select
              title="Digest hour"
              value={prefs.digest_hour}
              onChange={(e) => setPrefs({ ...prefs, digest_hour: parseInt(e.target.value) })}
              className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
          {saved && <span className="text-xs text-green-600 dark:text-green-400">Saved!</span>}
        </div>
      </div>
    </div>
  );
}

// ── Workspace Members Manager ─────────────────────────────────────────────────

type WsRole = 'owner' | 'admin' | 'member' | 'guest';

interface WsMember {
  id: string;
  name: string;
  email: string;
  role: WsRole;
}

const ROLE_BADGE: Record<WsRole, string> = {
  owner:  'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
  admin:  'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  member: 'bg-muted text-muted-foreground',
  guest:  'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
};

function WorkspaceMembersManager({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<WsMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<WsRole | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get<WsMember[]>(`/workspaces/${workspaceId}/members`)
      .then((r) => {
        setMembers(r.data);
        const me = r.data.find((m) => m.id === user?.id);
        setMyRole(me?.role ?? null);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, user?.id, version]);

  const fetchMembers = () => setVersion((v) => v + 1);

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      await api.post(`/workspaces/${workspaceId}/members`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      fetchMembers();
      toast.success('Member invited');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errMsg = msg ?? 'Failed to invite member.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const remove = async (memberId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      fetchMembers();
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const canManage = myRole === 'owner' || myRole === 'admin';

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Workspace Members</h2>
        <p className="text-xs text-muted-foreground">Guests can only view projects they are explicitly added to.</p>
      </div>

      {canManage && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Invite member</h3>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && invite()}
              placeholder="Email address"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            />
            <select
              title="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'guest')}
              className="border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <button
              type="button"
              onClick={invite}
              disabled={inviting || !inviteEmail.trim()}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Guest — read-only access to projects they are added to. Member — full access. Admin — manage workspace.</p>
        </div>
      )}

      <div className="bg-card border rounded-xl divide-y overflow-hidden">
        {members.map((m) => (
          <div key={m.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[m.role]}`}>
              {m.role}
            </span>
            {canManage && m.role !== 'owner' && m.id !== user?.id && (
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security Tab (workspace policy + personal 2FA) ────────────────────────────

interface WorkspaceSecurityData {
  require_2fa: boolean;
  members: Array<{ user_id: string; role: string }>;
}

function SecurityTab({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const [require2fa, setRequire2fa] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<WorkspaceSecurityData>(`/workspaces/${workspaceId}`),
      api.get<Array<{ id: string; role: string }>>(`/workspaces/${workspaceId}/members`),
    ]).then(([wsRes, membersRes]) => {
      setRequire2fa(wsRes.data.require_2fa ?? false);
      const me = membersRes.data.find((m) => m.id === user?.id);
      setUserRole(me?.role ?? null);
    }).finally(() => setLoading(false));
  }, [workspaceId, user?.id]);

  const toggleRequire2fa = async (val: boolean) => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/workspaces/${workspaceId}/security`, { require_2fa: val });
      setRequire2fa(val);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  const canEditPolicy = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="space-y-8">
      {canEditPolicy && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Workspace Security Policy</h2>
            <p className="text-xs text-muted-foreground">Enforce security requirements for all workspace members.</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <label
                className={`mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${require2fa ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={require2fa}
                  onChange={() => { void toggleRequire2fa(!require2fa); }}
                  disabled={saving}
                  aria-label="Require two-factor authentication"
                />
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${require2fa ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </label>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Require two-factor authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">Members without 2FA will be blocked from accessing workspace resources until they enable it.</p>
              </div>
              {saved && <span className="text-xs text-green-600 dark:text-green-400 self-center">Saved!</span>}
            </div>
          </div>
        </div>
      )}
      <TwoFactorSettings />
    </div>
  );
}

// ── Two-Factor Authentication Settings ────────────────────────────────────────

function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'idle' | 'setup' | 'codes'>('idle');
  const [qrUri, setQrUri] = useState('');
  const [manualEntry, setManualEntry] = useState('');
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const _qrRef = useRef<HTMLImageElement>(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get<TwoFactorStatus>('/user/two-factor-status')
      .then((r) => setStatus(r.data))
      .finally(() => setLoading(false));
  }, [version]);

  const fetchStatus = () => setVersion((v) => v + 1);

  const startEnable = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post<{ qr_code_url: string; manual_entry: string }>('/user/two-factor-authentication');
      setQrUri(data.qr_code_url);
      setManualEntry(data.manual_entry);
      setStep('setup');
    } finally { setSaving(false); }
  };

  const confirmEnable = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post<{ recovery_codes: string[] }>('/user/confirmed-two-factor-authentication', { code });
      setRecoveryCodes(data.recovery_codes);
      setStep('codes');
      fetchStatus();
    } catch {
      setError('Invalid code. Please try again.');
    } finally { setSaving(false); }
  };

  const disable = async () => {
    if (!disableCode.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.delete('/user/two-factor-authentication', { data: { code: disableCode } });
      setDisableCode('');
      fetchStatus();
    } catch {
      setError('Invalid code. Please try again.');
    } finally { setSaving(false); }
  };

  const loadRecoveryCodes = async () => {
    const { data } = await api.get<{ recovery_codes: string[] }>('/user/two-factor-recovery-codes');
    setRecoveryCodes(data.recovery_codes);
  };

  const regenerateCodes = async () => {
    if (!confirm('Regenerate recovery codes? Your old codes will stop working.')) return;
    const { data } = await api.post<{ recovery_codes: string[] }>('/user/two-factor-recovery-codes');
    setRecoveryCodes(data.recovery_codes);
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Two-Factor Authentication</h2>
        <p className="text-xs text-muted-foreground mb-4">Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc).</p>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Status badge */}
      <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status?.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{status?.enabled ? '2FA is enabled' : '2FA is disabled'}</p>
          <p className="text-xs text-muted-foreground">{status?.enabled ? 'Your account is protected with TOTP.' : 'Enable 2FA to secure your account.'}</p>
        </div>
        {!status?.enabled && step === 'idle' && (
          <button type="button" onClick={startEnable} disabled={saving} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Loading…' : 'Enable 2FA'}
          </button>
        )}
      </div>

      {/* Setup step: show QR code */}
      {step === 'setup' && (
        <div className="bg-card border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Scan with your authenticator app</h3>
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={_qrRef}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
              alt="2FA QR Code"
              className="w-44 h-44 rounded-lg border"
            />
            <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
            <code className="text-xs bg-muted px-3 py-1.5 rounded-lg font-mono tracking-widest text-foreground select-all">{manualEntry}</code>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Enter the 6-digit code from your app *</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest bg-background text-foreground"
              />
              <button type="button" onClick={confirmEnable} disabled={saving || code.length !== 6} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Verifying…' : 'Confirm'}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => { setStep('idle'); setCode(''); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Recovery codes after enabling */}
      {step === 'codes' && recoveryCodes.length > 0 && (
        <div className="bg-card border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Save your recovery codes</h3>
          <p className="text-xs text-muted-foreground">Store these somewhere safe. Each code can only be used once if you lose access to your authenticator.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {recoveryCodes.map((c) => (
              <code key={c} className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{c}</code>
            ))}
          </div>
          <button type="button" onClick={() => setStep('idle')} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">Done</button>
        </div>
      )}

      {/* Actions when 2FA is already enabled */}
      {status?.enabled && step === 'idle' && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recovery Codes</h3>
            {recoveryCodes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {recoveryCodes.map((c) => (
                    <code key={c} className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{c}</code>
                  ))}
                </div>
                <button type="button" onClick={regenerateCodes} className="text-xs text-orange-500 hover:text-orange-700 dark:hover:text-orange-300">Regenerate codes</button>
              </>
            ) : (
              <button type="button" onClick={loadRecoveryCodes} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Show recovery codes</button>
            )}
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Disable 2FA</h3>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit TOTP code"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 font-mono tracking-widest bg-background text-foreground"
              />
              <button type="button" onClick={disable} disabled={saving || disableCode.length !== 6} className="text-sm bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50">
                {saving ? 'Disabling…' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GitHub Settings ───────────────────────────────────────────────────────────

function GitHubSettings({ workspaceId }: { workspaceId: string }) {
  const [conn, setConn] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<GitHubConnection>(`/workspaces/${workspaceId}/github`)
      .then((r) => setConn(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const connect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setError('');
    try {
      const { data } = await api.post<GitHubConnection>(`/workspaces/${workspaceId}/github`, { token: token.trim() });
      setConn(data);
      setToken('');
      toast.success('GitHub connected');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errMsg = msg ?? 'Failed to connect to GitHub.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect GitHub? Project links and issue numbers will be preserved but no longer synced.')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/github`);
      setConn({ connected: false });
      toast.success('GitHub disconnected');
    } catch {
      toast.error('Failed to disconnect GitHub');
    }
  };

  const copySecret = (val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">GitHub Integration</h2>
        <p className="text-xs text-muted-foreground">Connect a GitHub Personal Access Token to link repositories, issues, and pull requests.</p>
      </div>

      {/* Connection status */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conn?.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {conn?.connected ? `Connected as @${conn.github_username}` : 'Not connected'}
            </p>
            <p className="text-xs text-muted-foreground">
              {conn?.connected ? 'GitHub API access is active for this workspace.' : 'Enter a Personal Access Token with repo scope.'}
            </p>
          </div>
          {conn?.connected && (
            <button
              type="button"
              onClick={disconnect}
              className="text-xs text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 rounded px-2 py-1"
            >
              Disconnect
            </button>
          )}
        </div>

        {!conn?.connected && (
          <div className="space-y-2">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connect()}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-background text-foreground"
              />
              <button
                type="button"
                onClick={connect}
                disabled={connecting || !token.trim()}
                className="text-sm bg-gray-900 dark:bg-gray-700 text-white px-4 py-1.5 rounded-lg hover:bg-black dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Create a token at <span className="font-mono">github.com/settings/tokens</span> with <span className="font-mono">repo</span> scope.
            </p>
          </div>
        )}
      </div>

      {/* Webhook setup */}
      {conn?.connected && conn.webhook_url && (
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Webhook Setup</h3>
          <p className="text-xs text-muted-foreground">
            Add this webhook to your GitHub repositories to auto-update tasks when issues or PRs change.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payload URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono text-foreground truncate">{conn.webhook_url}</code>
                <button
                  type="button"
                  onClick={() => copySecret(conn.webhook_url!)}
                  className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0 border rounded px-2 py-1"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Secret</label>
              <code className="block text-xs bg-muted px-3 py-2 rounded-lg font-mono text-foreground">{conn.webhook_secret}</code>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-medium">GitHub webhook events to subscribe:</p>
              <p><span className="font-mono">Issues</span> — closes linked tasks when an issue is closed</p>
              <p><span className="font-mono">Pull requests</span> — updates PR state on linked tasks</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
