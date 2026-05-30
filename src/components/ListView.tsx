'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight, Plus, AlertCircle, ArrowUp, ArrowRight, ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import { format } from 'date-fns';

import api from '@/lib/api';
import { cn, initials, isOverdue } from '@/lib/utils';
import type { ProjectStatus, Task } from '@/types';

import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const PRIORITY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  urgent: { icon: AlertCircle, color: 'text-destructive' },
  high:   { icon: ArrowUp,     color: 'text-warning' },
  medium: { icon: ArrowRight,  color: 'text-primary' },
  low:    { icon: ArrowDown,   color: 'text-foreground-muted' },
};

type SortField = 'title' | 'due_date' | 'priority' | 'estimate' | null;

function sortTasks(tasks: Task[], field: SortField, dir: 'asc' | 'desc'): Task[] {
  if (!field) return tasks;
  return [...tasks].sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;
    if (field === 'title') {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    } else if (field === 'due_date') {
      aVal = a.due_date ?? '';
      bVal = b.due_date ?? '';
    } else if (field === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      aVal = order[a.priority as keyof typeof order] ?? 99;
      bVal = order[b.priority as keyof typeof order] ?? 99;
    } else if (field === 'estimate') {
      aVal = a.estimate ?? -1;
      bVal = b.estimate ?? -1;
    }
    if (aVal === null || aVal === '') aVal = dir === 'asc' ? '￿' : '';
    if (bVal === null || bVal === '') bVal = dir === 'asc' ? '￿' : '';
    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

interface Props {
  tasks: Record<string, Task[]>;
  statuses: ProjectStatus[];
  workspaceId: string;
  projectId: string;
  selectedIds: Set<string>;
  onSelectTask: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onRefresh: () => void;
}

interface InlineAddProps {
  statusId: string;
  workspaceId: string;
  projectId: string;
  onCreated: () => void;
}

function InlineAdd({ statusId, workspaceId, projectId, onCreated }: InlineAddProps) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!title.trim()) { setActive(false); return; }
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
      title: title.trim(),
      project_status_id: statusId,
    }).then(() => { setTitle(''); setActive(false); onCreated(); })
      .catch(() => setActive(false));
  };

  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  if (!active) {
    return (
      <tr>
        <td colSpan={9}>
          <button
            type="button"
            onClick={() => setActive(true)}
            className="flex items-center gap-2 text-xs text-foreground-tertiary hover:text-foreground transition-colors py-1.5 pl-10 w-full"
          >
            <Plus className="w-3.5 h-3.5" />Add task
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={9} className="px-3 py-1">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') { setActive(false); setTitle(''); }
          }}
          onBlur={submit}
          placeholder="Task title… press Enter to save"
          className="w-full text-sm bg-muted/50 border border-primary/30 rounded px-3 py-1.5 outline-none focus:border-primary"
        />
      </td>
    </tr>
  );
}

function SortButton({
  field, label, sortField, toggleSort,
}: {
  field: SortField; label: string; sortField: SortField; toggleSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium transition-colors',
        active ? 'text-foreground' : 'text-foreground-muted hover:text-foreground',
      )}
    >
      {label}
      <ChevronsUpDown className={cn('w-3 h-3', active && 'text-primary')} />
    </button>
  );
}

export default function ListView({
  tasks, statuses, workspaceId, projectId, selectedIds, onSelectTask, onTaskClick, onRefresh,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Groups default to expanded: expanded[id] !== false treats missing key as true

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: prev[id] !== false ? false : true }));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const flatTasks = statuses.flatMap((s) => tasks[s.id] ?? []);
  const allSelected = flatTasks.length > 0 && flatTasks.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = (checked: boolean) => {
    flatTasks.forEach((t) => {
      const has = selectedIds.has(t.id);
      if (checked && !has) onSelectTask(t.id);
      if (!checked && has) onSelectTask(t.id);
    });
  };

  return (
    <div className="flex-1 overflow-auto px-6 py-4 animate-fade-in">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b border-border">
            <th className="w-8 px-3 py-2 text-left">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleSelectAll(v as boolean)}
              />
            </th>
            <th className="px-3 py-2 text-left min-w-[260px]">
              <SortButton field="title" label="Title" sortField={sortField} toggleSort={toggleSort} />
            </th>
            <th className="px-3 py-2 text-left w-32 text-xs font-medium text-foreground-muted">Status</th>
            <th className="px-3 py-2 text-left w-28">
              <SortButton field="priority" label="Priority" sortField={sortField} toggleSort={toggleSort} />
            </th>
            <th className="px-3 py-2 text-left w-24 text-xs font-medium text-foreground-muted">Assignees</th>
            <th className="px-3 py-2 text-left w-28">
              <SortButton field="due_date" label="Due date" sortField={sortField} toggleSort={toggleSort} />
            </th>
            <th className="px-3 py-2 text-left w-16">
              <SortButton field="estimate" label="Pts" sortField={sortField} toggleSort={toggleSort} />
            </th>
            <th className="px-3 py-2 text-left w-40 text-xs font-medium text-foreground-muted">Labels</th>
            <th className="px-3 py-2 text-left w-28 text-xs font-medium text-foreground-muted">Sprint</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((status) => {
            const groupTasks = sortTasks(tasks[status.id] ?? [], sortField, sortDir);
            const isExpanded = expanded[status.id] !== false;

            return (
              <>
                {/* Group header */}
                <tr key={`group-${status.id}`} className="bg-background-secondary hover:bg-background-secondary border-b border-border/50">
                  <td colSpan={9} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleGroup(status.id)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors text-foreground-secondary"
                    >
                      <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', isExpanded && 'rotate-90')} />
                      <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0">
                        <circle cx="4" cy="4" r="4" fill={status.color} />
                      </svg>
                      {status.name}
                      <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full ml-1">
                        {groupTasks.length}
                      </span>
                    </button>
                  </td>
                </tr>

                {/* Task rows */}
                {isExpanded && groupTasks.map((task) => {
                  const isSelected = selectedIds.has(task.id);
                  const PIcon = PRIORITY_CONFIG[task.priority]?.icon ?? ArrowRight;
                  const pColor = PRIORITY_CONFIG[task.priority]?.color ?? 'text-foreground-muted';

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        'hover:bg-accent/30 transition-colors cursor-pointer group border-b border-border/30',
                        isSelected && 'bg-primary-subtle/20',
                      )}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={(e) => { e.stopPropagation(); onSelectTask(task.id); }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onSelectTask(task.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium max-w-[260px]">
                        <span className="block truncate text-sm">{task.title}</span>
                        {task.children && task.children.length > 0 && (
                          <span className="text-[10px] text-foreground-muted">
                            {task.children.length} subtask{task.children.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground-secondary">
                          <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
                            <circle cx="3" cy="3" r="3" fill={task.project_status?.color ?? status.color} />
                          </svg>
                          {task.project_status?.name ?? status.name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn('flex items-center gap-1 text-xs', pColor)}>
                          <PIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="capitalize">{task.priority}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((a) => (
                            <Avatar key={a.id} size="sm" className="border border-background">
                              <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees.length > 3 && (
                            <span className="w-6 h-6 rounded-full bg-muted text-foreground-muted text-[9px] font-bold flex items-center justify-center border border-background">
                              +{task.assignees.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'text-xs',
                          task.due_date && isOverdue(task.due_date) ? 'text-destructive font-medium' : 'text-foreground-tertiary',
                        )}>
                          {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground-tertiary">
                        {task.estimate ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {task.labels.slice(0, 2).map((l) => (
                            <span
                              key={l.id}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border border-border bg-muted text-foreground-secondary"
                            >
                              <svg width="5" height="5" viewBox="0 0 5 5">
                                <circle cx="2.5" cy="2.5" r="2.5" fill={l.color} />
                              </svg>
                              {l.name}
                            </span>
                          ))}
                          {task.labels.length > 2 && (
                            <span className="text-[10px] text-foreground-muted">+{task.labels.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground-tertiary truncate max-w-[112px]">
                        {task.sprint?.name ?? '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Inline add per group */}
                {isExpanded && (
                  <InlineAdd
                    statusId={status.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    onCreated={onRefresh}
                  />
                )}
              </>
            );
          })}

          {flatTasks.length === 0 && (
            <tr>
              <td colSpan={9} className="py-16 text-center">
                <p className="text-sm text-foreground-muted">No tasks yet. Create one above.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
