'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { Label, Milestone, WorkspaceMember, TaskFilters } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const SORT_LABELS: Record<string, string> = {
  due_date: 'Due Date',
  created_at: 'Created',
  title: 'Title',
  estimate: 'Story Points',
};

// Generic dropdown wrapper
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
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
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-xl z-30 min-w-48">
          {children}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ workspaceId, projectId, filters, onChange }: Props) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    api.get<Label[]>(`/workspaces/${workspaceId}/labels`).then((r) => setLabels(r.data));
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`).then((r) => setMembers(r.data));
    api.get<Milestone[]>(`/workspaces/${workspaceId}/projects/${projectId}/milestones`).then((r) => setMilestones(r.data));
  }, [workspaceId, projectId]);

  const set = useCallback(
    (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch }),
    [filters, onChange],
  );

  const toggleArrayItem = (key: 'label_ids' | 'assignee_ids', value: string) => {
    const current = filters[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    set({ [key]: next.length ? next : undefined });
  };

  const clearAll = () => onChange({});

  // Build active chips for display
  const chips: { label: string; onRemove: () => void }[] = [];

  (filters.label_ids ?? []).forEach((id) => {
    const lbl = labels.find((l) => l.id === id);
    if (lbl) chips.push({ label: `Label: ${lbl.name}`, onRemove: () => toggleArrayItem('label_ids', id) });
  });

  (filters.assignee_ids ?? []).forEach((id) => {
    const m = members.find((m) => m.id === id);
    if (m) chips.push({ label: `Assignee: ${m.name}`, onRemove: () => toggleArrayItem('assignee_ids', id) });
  });

  if (filters.milestone_id) {
    const ms = milestones.find((m) => m.id === filters.milestone_id);
    chips.push({ label: `Milestone: ${ms?.name ?? '…'}`, onRemove: () => set({ milestone_id: undefined }) });
  }

  if (filters.status) {
    chips.push({ label: `Status: ${STATUS_LABELS[filters.status] ?? filters.status}`, onRemove: () => set({ status: undefined }) });
  }

  if (filters.due_date_from || filters.due_date_to) {
    const from = filters.due_date_from ?? '';
    const to = filters.due_date_to ?? '';
    chips.push({ label: `Due: ${from}${from && to ? ' → ' : ''}${to}`, onRemove: () => set({ due_date_from: undefined, due_date_to: undefined }) });
  }

  if (filters.is_overdue) chips.push({ label: 'Overdue', onRemove: () => set({ is_overdue: undefined }) });
  if (filters.has_subtasks) chips.push({ label: 'Has sub-tasks', onRemove: () => set({ has_subtasks: undefined }) });

  const filterBtnCls = 'text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 flex items-center gap-1';
  const activeFilterBtnCls = 'text-xs border border-blue-300 rounded-lg px-2.5 py-1.5 bg-blue-50 text-blue-700 flex items-center gap-1';

  const hasFilters = chips.length > 0;

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 flex-wrap">

        {/* Labels */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.label_ids?.length ?? 0) > 0 ? activeFilterBtnCls : filterBtnCls}>
              🏷 Labels {(filters.label_ids?.length ?? 0) > 0 && `(${filters.label_ids!.length})`}
            </button>
          }
        >
          <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
            {labels.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">No labels</p>}
            {labels.map((l) => {
              const active = (filters.label_ids ?? []).includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleArrayItem('label_ids', l.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                    {active && '✓'}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-gray-700">{l.name}</span>
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Assignees */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.assignee_ids?.length ?? 0) > 0 ? activeFilterBtnCls : filterBtnCls}>
              👤 Assignee {(filters.assignee_ids?.length ?? 0) > 0 && `(${filters.assignee_ids!.length})`}
            </button>
          }
        >
          <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
            {members.map((m) => {
              const active = (filters.assignee_ids ?? []).includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleArrayItem('assignee_ids', m.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                    {active && '✓'}
                  </span>
                  <span className="text-gray-700">{m.name}</span>
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Status */}
        <Dropdown
          trigger={
            <button type="button" className={filters.status ? activeFilterBtnCls : filterBtnCls}>
              📋 Status {filters.status && `(${STATUS_LABELS[filters.status]})`}
            </button>
          }
        >
          <div className="p-2 space-y-0.5">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set({ status: filters.status === value ? undefined : value })}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left ${filters.status === value ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
              >
                {filters.status === value && <span className="text-blue-600">✓</span>}
                {label}
              </button>
            ))}
          </div>
        </Dropdown>

        {/* Milestone */}
        {milestones.length > 0 && (
          <Dropdown
            trigger={
              <button type="button" className={filters.milestone_id ? activeFilterBtnCls : filterBtnCls}>
                🚩 Milestone
              </button>
            }
          >
            <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
              {milestones.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => set({ milestone_id: filters.milestone_id === m.id ? undefined : m.id })}
                  className={`w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left ${filters.milestone_id === m.id ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </Dropdown>
        )}

        {/* Due Date range */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.due_date_from || filters.due_date_to) ? activeFilterBtnCls : filterBtnCls}>
              📅 Due Date
            </button>
          }
        >
          <div className="p-3 space-y-2 w-56">
            <div>
              <p className="text-xs text-gray-400 mb-1">From</p>
              <input
                type="date"
                title="Due date from"
                value={filters.due_date_from ?? ''}
                onChange={(e) => set({ due_date_from: e.target.value || undefined })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">To</p>
              <input
                type="date"
                title="Due date to"
                value={filters.due_date_to ?? ''}
                onChange={(e) => set({ due_date_to: e.target.value || undefined })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Dropdown>

        {/* Quick toggles */}
        <button
          type="button"
          onClick={() => set({ is_overdue: filters.is_overdue ? undefined : true })}
          className={filters.is_overdue ? activeFilterBtnCls : filterBtnCls}
        >
          🔴 Overdue
        </button>

        <button
          type="button"
          onClick={() => set({ has_subtasks: filters.has_subtasks ? undefined : true })}
          className={filters.has_subtasks ? activeFilterBtnCls : filterBtnCls}
        >
          🪜 Has sub-tasks
        </button>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <Dropdown
            trigger={
              <button type="button" className={filterBtnCls}>
                ↕ Sort: {filters.sort_by ? SORT_LABELS[filters.sort_by] : 'Default'}
              </button>
            }
          >
            <div className="p-2 space-y-0.5 w-44">
              <button
                type="button"
                onClick={() => set({ sort_by: undefined, sort_dir: undefined })}
                className="w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left text-gray-700"
              >
                Default
              </button>
              {(Object.entries(SORT_LABELS) as [TaskFilters['sort_by'], string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    set({
                      sort_by: value,
                      sort_dir: filters.sort_by === value && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left ${filters.sort_by === value ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  {label}
                  {filters.sort_by === value && (
                    <span className="text-xs">{filters.sort_dir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </button>
              ))}
            </div>
          </Dropdown>

          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-600 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-blue-900 leading-none"
                aria-label={`Remove filter: ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
