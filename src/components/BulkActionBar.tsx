'use client';

import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { WorkspaceMember, Label, TaskStatus } from '@/types';

interface Props {
  selectedIds: string[];
  workspaceId: string;
  projectId: string;
  onClear: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

function ActionDropdown({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
      >
        {label}
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-xl shadow-xl z-50 min-w-44 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

export default function BulkActionBar({ selectedIds, workspaceId, projectId, onClear, onRefresh }: Props) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
      .then((r) => setMembers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    api.get<Label[]>(`/workspaces/${workspaceId}/labels`)
      .then((r) => setLabels(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [workspaceId]);

  const runBulk = async (action: string, payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks/bulk`, {
        task_ids: selectedIds,
        action,
        payload,
      });
      onRefresh();
      onClear();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} task(s)? This cannot be undone.`)) return;
    await runBulk('delete', {});
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 border border-gray-700">
      <span className="text-sm font-semibold text-white/90">
        {selectedIds.length} selected
      </span>

      <div className="w-px h-5 bg-white/20" />

      {/* Move status */}
      <ActionDropdown label="Move to…">
        <div className="py-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={busy}
              onClick={() => runBulk('move_status', { status: s.value })}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              {s.label}
            </button>
          ))}
        </div>
      </ActionDropdown>

      {/* Assign */}
      {members.length > 0 && (
        <ActionDropdown label="Assign…">
          <div className="py-1 max-h-48 overflow-y-auto">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => runBulk('assign', { user_id: m.id })}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                {m.name}
              </button>
            ))}
          </div>
        </ActionDropdown>
      )}

      {/* Add label */}
      {labels.length > 0 && (
        <ActionDropdown label="Add label…">
          <div className="py-1 max-h-48 overflow-y-auto">
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={busy}
                onClick={() => runBulk('add_label', { label_id: l.id })}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
                  <circle cx="5" cy="5" r="5" fill={l.color} />
                </svg>
                {l.name}
              </button>
            ))}
          </div>
        </ActionDropdown>
      )}

      {/* Delete */}
      <button
        type="button"
        disabled={busy}
        onClick={confirmDelete}
        className="text-sm bg-red-500/80 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
      >
        Delete
      </button>

      <div className="w-px h-5 bg-white/20" />

      <button
        type="button"
        onClick={onClear}
        className="text-sm text-white/60 hover:text-white"
        aria-label="Deselect all"
      >
        ✕
      </button>
    </div>
  );
}
