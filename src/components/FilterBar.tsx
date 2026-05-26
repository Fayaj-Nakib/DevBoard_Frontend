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

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

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
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#DFE1E6] rounded-lg shadow-lg z-30 min-w-48">
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

  const hasFilters = chips.length > 0;

  const btnBase = 'inline-flex items-center gap-1.5 text-xs font-medium text-[#626F86] border border-[#DFE1E6] bg-white rounded px-2.5 py-1.5 hover:bg-[#F4F5F7] hover:border-[#B3BAC5] transition-colors';
  const btnActive = 'inline-flex items-center gap-1.5 text-xs font-medium text-[#0052CC] border border-[#0052CC] bg-[#DEEBFF] rounded px-2.5 py-1.5 hover:bg-[#B3D4FF] transition-colors';

  return (
    <div className="space-y-2.5 mb-5">
      <div className="flex items-center gap-2 flex-wrap">

        {/* Assignees */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.assignee_ids?.length ?? 0) > 0 ? btnActive : btnBase}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Assignee
              {(filters.assignee_ids?.length ?? 0) > 0 && (
                <span className="bg-[#0052CC] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {filters.assignee_ids!.length}
                </span>
              )}
              <ChevronDown />
            </button>
          }
        >
          <div className="p-1.5 max-h-56 overflow-y-auto">
            {members.length === 0 && <p className="text-xs text-[#626F86] px-2.5 py-2">No members found</p>}
            {members.map((m) => {
              const active = (filters.assignee_ids ?? []).includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleArrayItem('assignee_ids', m.id)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${active ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-[#0052CC] border-[#0052CC] text-white' : 'border-[#B3BAC5]'}`}>
                    {active && <CheckIcon />}
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                    {m.name[0].toUpperCase()}
                  </div>
                  <span className="font-medium">{m.name}</span>
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Labels */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.label_ids?.length ?? 0) > 0 ? btnActive : btnBase}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Label
              {(filters.label_ids?.length ?? 0) > 0 && (
                <span className="bg-[#0052CC] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {filters.label_ids!.length}
                </span>
              )}
              <ChevronDown />
            </button>
          }
        >
          <div className="p-1.5 max-h-56 overflow-y-auto">
            {labels.length === 0 && <p className="text-xs text-[#626F86] px-2.5 py-2">No labels yet</p>}
            {labels.map((l) => {
              const active = (filters.label_ids ?? []).includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleArrayItem('label_ids', l.id)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${active ? 'bg-[#DEEBFF]' : 'hover:bg-[#F4F5F7]'}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#0052CC] border-[#0052CC] text-white' : 'border-[#B3BAC5]'}`}>
                    {active && <CheckIcon />}
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="flex-shrink-0">
                    <circle cx="5" cy="5" r="5" fill={l.color} />
                  </svg>
                  <span className={`font-medium ${active ? 'text-[#0052CC]' : 'text-[#172B4D]'}`}>{l.name}</span>
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Status */}
        <Dropdown
          trigger={
            <button type="button" className={filters.status ? btnActive : btnBase}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </svg>
              Status
              {filters.status && <span className="font-semibold">: {STATUS_LABELS[filters.status]}</span>}
              <ChevronDown />
            </button>
          }
        >
          <div className="p-1.5">
            {Object.entries(STATUS_LABELS).map(([value, label]) => {
              const active = filters.status === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ status: active ? undefined : value })}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${active ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`}
                >
                  {active ? (
                    <span className="w-4 h-4 flex items-center justify-center text-[#0052CC]"><CheckIcon /></span>
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Milestone */}
        {milestones.length > 0 && (
          <Dropdown
            trigger={
              <button type="button" className={filters.milestone_id ? btnActive : btnBase}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18"/><path d="M3 8h14l-3 4 3 4H3"/>
                </svg>
                Milestone
                <ChevronDown />
              </button>
            }
          >
            <div className="p-1.5 max-h-48 overflow-y-auto">
              {milestones.map((m) => {
                const active = filters.milestone_id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set({ milestone_id: active ? undefined : m.id })}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${active ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`}
                  >
                    {active ? (
                      <span className="w-4 h-4 flex items-center justify-center text-[#0052CC]"><CheckIcon /></span>
                    ) : (
                      <span className="w-4 h-4 flex-shrink-0" />
                    )}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </Dropdown>
        )}

        {/* Due Date */}
        <Dropdown
          trigger={
            <button type="button" className={(filters.due_date_from || filters.due_date_to) ? btnActive : btnBase}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              Due Date
              <ChevronDown />
            </button>
          }
        >
          <div className="p-3 space-y-2.5 w-56">
            <div>
              <p className="text-[11px] font-semibold text-[#626F86] uppercase tracking-wide mb-1.5">From</p>
              <input
                type="date"
                title="Due date from"
                value={filters.due_date_from ?? ''}
                onChange={(e) => set({ due_date_from: e.target.value || undefined })}
                className="w-full border border-[#DFE1E6] rounded px-2.5 py-1.5 text-sm text-[#172B4D] outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC]"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#626F86] uppercase tracking-wide mb-1.5">To</p>
              <input
                type="date"
                title="Due date to"
                value={filters.due_date_to ?? ''}
                onChange={(e) => set({ due_date_to: e.target.value || undefined })}
                className="w-full border border-[#DFE1E6] rounded px-2.5 py-1.5 text-sm text-[#172B4D] outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-[#0052CC]"
              />
            </div>
          </div>
        </Dropdown>

        {/* Quick toggles */}
        <button
          type="button"
          onClick={() => set({ is_overdue: filters.is_overdue ? undefined : true })}
          className={`${filters.is_overdue ? 'text-red-600 border-red-300 bg-red-50 hover:bg-red-100' : `${btnBase}`} inline-flex items-center gap-1.5 text-xs font-medium border rounded px-2.5 py-1.5 transition-colors`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" x2="12" y1="9" y2="13"/>
            <line x1="12" x2="12.01" y1="17" y2="17"/>
          </svg>
          Overdue
        </button>

        <button
          type="button"
          onClick={() => set({ has_subtasks: filters.has_subtasks ? undefined : true })}
          className={filters.has_subtasks ? btnActive : btnBase}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
          Has sub-tasks
        </button>

        {/* Sort — right-aligned */}
        <div className="ml-auto">
          <Dropdown
            trigger={
              <button type="button" className={btnBase}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>
                </svg>
                Sort{filters.sort_by ? `: ${SORT_LABELS[filters.sort_by]}` : ''}
                {filters.sort_by && (
                  <span className="text-[#0052CC]">{filters.sort_dir === 'desc' ? ' ↓' : ' ↑'}</span>
                )}
                <ChevronDown />
              </button>
            }
          >
            <div className="p-1.5 w-44">
              <button
                type="button"
                onClick={() => set({ sort_by: undefined, sort_dir: undefined })}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${!filters.sort_by ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`}
              >
                Default order
              </button>
              {(Object.entries(SORT_LABELS) as [TaskFilters['sort_by'], string][]).map(([value, label]) => {
                const active = filters.sort_by === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set({ sort_by: value, sort_dir: active && filters.sort_dir === 'asc' ? 'desc' : 'asc' })}
                    className={`flex items-center justify-between w-full px-2.5 py-2 rounded text-sm text-left transition-colors ${active ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`}
                  >
                    {label}
                    {active && <span className="text-[#0052CC]">{filters.sort_dir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                );
              })}
            </div>
          </Dropdown>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-[#DE350B] hover:text-[#BF2600] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-[#DEEBFF] text-[#0052CC] border border-[#B3D4FF] rounded-full px-2.5 py-1 font-medium"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-[#0747A6] leading-none ml-0.5 text-[#4C9AFF]"
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
