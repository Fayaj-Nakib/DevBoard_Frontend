'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Webhook, WebhookEvent, WebhookDelivery, TwoFactorStatus } from '@/types';

const ALL_EVENTS: WebhookEvent[] = [
  'task.created', 'task.updated', 'task.deleted',
  'task.status_changed', 'comment.created',
  'project.created', 'project.updated',
];

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'webhooks' | 'profile' | 'security'>('webhooks');

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-sm font-semibold text-gray-800">Workspace Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button type="button" onClick={logout} className="text-sm text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('webhooks')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'webhooks' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Webhooks
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'profile' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === 'security' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Security
          </button>
        </div>

        {tab === 'webhooks' && <WebhookManager workspaceId={workspaceId} />}
        {tab === 'profile'  && <UserDigestSettings />}
        {tab === 'security' && <TwoFactorSettings />}
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

  const fetchWebhooks = useCallback(() => {
    api.get<Webhook[]>(`/workspaces/${workspaceId}/webhooks`)
      .then((r) => setWebhooks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

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
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (wh: Webhook) => {
    await api.patch(`/workspaces/${workspaceId}/webhooks/${wh.id}`, { is_active: !wh.is_active });
    fetchWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await api.delete(`/workspaces/${workspaceId}/webhooks/${id}`);
    fetchWebhooks();
  };

  const testWebhook = async (id: string) => {
    await api.post(`/workspaces/${workspaceId}/webhooks/${id}/test`);
    alert('Test ping dispatched.');
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Webhooks</h2>
          <p className="text-xs text-gray-500">Receive HTTP POST notifications when events occur in this workspace.</p>
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
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Webhook</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Slack notifications"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Endpoint URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">Events *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded"
                  />
                  <span className="text-gray-700 font-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
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
        <p className="text-sm text-gray-400 py-4 text-center">No webhooks configured yet.</p>
      )}

      <div className="space-y-2">
        {webhooks.map((wh) => (
          <div key={wh.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleActive(wh)}
                title={wh.is_active ? 'Disable' : 'Enable'}
                className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${wh.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${wh.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{wh.name}</p>
                <p className="text-xs text-gray-400 truncate">{wh.url}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => testWebhook(wh.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-0.5"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
                  className="text-xs text-gray-400 hover:text-gray-600"
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
                <span key={ev} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{ev}</span>
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
    return <p className="text-xs text-gray-400 px-4 pb-3">No recent deliveries.</p>;
  }
  return (
    <div className="border-t divide-y">
      {deliveries.map((d) => (
        <div key={d.id} className="px-4 py-2 flex items-center gap-3 text-xs">
          <span
            className={`w-16 text-center px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              d.response_status && d.response_status < 300
                ? 'bg-green-50 text-green-600'
                : d.failed_at
                ? 'bg-red-50 text-red-500'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {d.response_status ?? (d.failed_at ? 'failed' : 'pending')}
          </span>
          <span className="font-mono text-gray-500 flex-1 truncate">{d.event}</span>
          <span className="text-gray-400 flex-shrink-0">
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Email Digest</h2>
        <p className="text-xs text-gray-500">Receive a daily summary of your tasks and activity.</p>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.digest_enabled}
            onChange={(e) => setPrefs({ ...prefs, digest_enabled: e.target.checked })}
            className="rounded w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">Enable daily digest</p>
            <p className="text-xs text-gray-400">Get a morning summary of due tasks, overdue items, and recent mentions.</p>
          </div>
        </label>

        {prefs.digest_enabled && (
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Send digest at (local hour)</label>
            <select
              title="Digest hour"
              value={prefs.digest_hour}
              onChange={(e) => setPrefs({ ...prefs, digest_hour: parseInt(e.target.value) })}
              className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
          {saved && <span className="text-xs text-green-600">Saved!</span>}
        </div>
      </div>
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

  const fetchStatus = useCallback(() => {
    api.get<TwoFactorStatus>('/user/two-factor-status')
      .then((r) => setStatus(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

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

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Two-Factor Authentication</h2>
        <p className="text-xs text-gray-500 mb-4">Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc).</p>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Status badge */}
      <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{status?.enabled ? '2FA is enabled' : '2FA is disabled'}</p>
          <p className="text-xs text-gray-400">{status?.enabled ? 'Your account is protected with TOTP.' : 'Enable 2FA to secure your account.'}</p>
        </div>
        {!status?.enabled && step === 'idle' && (
          <button type="button" onClick={startEnable} disabled={saving} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Loading…' : 'Enable 2FA'}
          </button>
        )}
      </div>

      {/* Setup step: show QR code */}
      {step === 'setup' && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Scan with your authenticator app</h3>
          <div className="flex flex-col items-center gap-3">
            <img
              ref={_qrRef}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
              alt="2FA QR Code"
              className="w-44 h-44 rounded-lg border"
            />
            <p className="text-xs text-gray-500">Or enter this key manually:</p>
            <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono tracking-widest text-gray-700 select-all">{manualEntry}</code>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Enter the 6-digit code from your app *</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
              />
              <button type="button" onClick={confirmEnable} disabled={saving || code.length !== 6} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Verifying…' : 'Confirm'}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => { setStep('idle'); setCode(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      )}

      {/* Recovery codes after enabling */}
      {step === 'codes' && recoveryCodes.length > 0 && (
        <div className="bg-white border border-green-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Save your recovery codes</h3>
          <p className="text-xs text-gray-500">Store these somewhere safe. Each code can only be used once if you lose access to your authenticator.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {recoveryCodes.map((c) => (
              <code key={c} className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{c}</code>
            ))}
          </div>
          <button type="button" onClick={() => setStep('idle')} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">Done</button>
        </div>
      )}

      {/* Actions when 2FA is already enabled */}
      {status?.enabled && step === 'idle' && (
        <div className="space-y-3">
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Recovery Codes</h3>
            {recoveryCodes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {recoveryCodes.map((c) => (
                    <code key={c} className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{c}</code>
                  ))}
                </div>
                <button type="button" onClick={regenerateCodes} className="text-xs text-orange-500 hover:text-orange-700">Regenerate codes</button>
              </>
            ) : (
              <button type="button" onClick={loadRecoveryCodes} className="text-sm text-blue-600 hover:text-blue-800">Show recovery codes</button>
            )}
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Disable 2FA</h3>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit TOTP code"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 font-mono tracking-widest"
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
