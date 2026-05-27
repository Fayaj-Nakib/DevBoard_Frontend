'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { TimeLog, TaskTimeSummary } from '@/types';

interface Props {
  taskId: string;
  currentUserId: string;
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtElapsed(startIso: string): string {
  const secs = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimeTracker({ taskId, currentUserId }: Props) {
  const [summary, setSummary] = useState<TaskTimeSummary | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimeLog | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ hours: '', minutes: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [version, setVersion] = useState(0);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<TaskTimeSummary>(`/tasks/${taskId}/time-logs`)
      .then((r) => {
        setSummary(r.data);
        const running = r.data.logs.find((l) => l.is_running && l.user?.id === currentUserId);
        setActiveTimer(running ?? null);
      });
  }, [taskId, currentUserId, version]);

  // Tick every second while a timer is running to keep elapsed display fresh
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (activeTimer?.started_at) {
      tickRef.current = setInterval(() => setTick((v) => v + 1), 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [activeTimer]);

  const fetchLogs = () => setVersion((v) => v + 1);
  const elapsed = activeTimer?.started_at ? fmtElapsed(activeTimer.started_at) : '';

  const startTimer = async () => {
    setSaving(true);
    try {
      await api.post(`/tasks/${taskId}/time-logs`, { type: 'timer' });
      fetchLogs();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Could not start timer.');
    } finally {
      setSaving(false);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    setSaving(true);
    try {
      await api.patch(`/time-logs/${activeTimer.id}`, {});
      setActiveTimer(null);
      fetchLogs();
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async () => {
    const totalMin = (parseInt(manualForm.hours || '0') * 60) + parseInt(manualForm.minutes || '0');
    if (totalMin <= 0) return;
    setSaving(true);
    try {
      await api.post(`/tasks/${taskId}/time-logs`, {
        type: 'manual',
        duration_minutes: totalMin,
        started_at: manualForm.date,
        note: manualForm.note || null,
      });
      setManualForm({ hours: '', minutes: '', note: '', date: new Date().toISOString().split('T')[0] });
      setShowManual(false);
      fetchLogs();
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm('Delete this time log?')) return;
    await api.delete(`/time-logs/${logId}`);
    fetchLogs();
  };

  const saveEditNote = async (logId: string) => {
    await api.patch(`/time-logs/${logId}`, { note: editNote });
    setEditingId(null);
    fetchLogs();
  };

  if (!summary) return <div className="text-xs text-gray-400 py-2">Loading time logs…</div>;

  return (
    <div className="space-y-4">
      {/* Total + timer controls */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-gray-700">
            {fmtMinutes(summary.total_logged_minutes)} logged
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTimer ? (
            <button
              type="button"
              onClick={stopTimer}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 font-medium"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {elapsed} · Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={startTimer}
              disabled={saving}
              className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 font-medium"
            >
              ▶ Start timer
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-xs text-gray-500 border rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            + Manual
          </button>
        </div>
      </div>

      {/* Manual entry form */}
      {showManual && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border">
          <p className="text-xs font-semibold text-gray-600">Add manual entry</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="manual-hours" className="text-xs text-gray-400 block mb-0.5">Hours</label>
              <input
                id="manual-hours"
                type="number"
                min="0"
                value={manualForm.hours}
                onChange={(e) => setManualForm({ ...manualForm, hours: e.target.value })}
                placeholder="0"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="manual-minutes" className="text-xs text-gray-400 block mb-0.5">Minutes</label>
              <input
                id="manual-minutes"
                type="number"
                min="0"
                max="59"
                value={manualForm.minutes}
                onChange={(e) => setManualForm({ ...manualForm, minutes: e.target.value })}
                placeholder="0"
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="manual-date" className="text-xs text-gray-400 block mb-0.5">Date</label>
              <input
                id="manual-date"
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <input
            type="text"
            value={manualForm.note}
            onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
            placeholder="Note (optional)"
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitManual}
              disabled={saving || (parseInt(manualForm.hours || '0') + parseInt(manualForm.minutes || '0') <= 0)}
              className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              {saving ? 'Saving…' : 'Add entry'}
            </button>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Log list */}
      {summary.logs.length > 0 && (
        <div className="divide-y border rounded-xl overflow-hidden">
          {summary.logs.map((log) => (
            <div key={log.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {log.duration_minutes != null ? fmtMinutes(log.duration_minutes) : (
                      <span className="text-blue-500">Running…</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">{log.user?.name}</span>
                  {log.started_at && (
                    <span className="text-xs text-gray-300">
                      {new Date(log.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {editingId === log.id ? (
                  <div className="mt-1 flex gap-1">
                    <input
                      aria-label="Edit note"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                    <button type="button" onClick={() => saveEditNote(log.id)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : log.note ? (
                  <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>
                ) : null}
              </div>
              {log.user?.id === currentUserId && !log.is_running && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingId(log.id); setEditNote(log.note ?? ''); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                    title="Edit note"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLog(log.id)}
                    className="text-xs text-gray-300 hover:text-red-500"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {summary.logs.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No time logged yet.</p>
      )}
    </div>
  );
}
