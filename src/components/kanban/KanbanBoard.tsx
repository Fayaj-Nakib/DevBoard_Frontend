'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import {
  Plus, MoreHorizontal, GripVertical,
  Calendar, MessageSquare, Paperclip, GitBranch,
  AlertCircle, ArrowUp, ArrowRight, ArrowDown,
} from 'lucide-react';
import { cn, getPriorityColor, isOverdue, initials, avatarBg } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { ProjectStatus, Task } from '@/types';

/* ─── Exported types ────────────────────────────────────────────────────────── */
export type { Task };

export interface ReorderItem {
  id: string;
  status: string;
  project_status_id?: string;
  position: number;
}

/* ─── Props ─────────────────────────────────────────────────────────────────── */
interface Props {
  tasks: Record<string, Task[]>;
  columns?: ProjectStatus[];
  onReorder: (items: ReorderItem[]) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onAddTask?: (statusId: string) => void;
  onQuickCreate?: (title: string, statusId: string) => Promise<void>;
  onMoveTask?: (taskId: string, statusId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onAddStatus?: (name: string, color: string) => Promise<void>;
  selectedIds?: Set<string>;
  onSelectTask?: (taskId: string) => void;
  loading?: boolean;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const DEFAULT_COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const;
type DefaultColumn = (typeof DEFAULT_COLUMNS)[number];

const DEFAULT_LABELS: Record<DefaultColumn, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
};

const DEFAULT_COLORS: Record<DefaultColumn, string> = {
  todo:        '#64748B',
  in_progress: '#7C3AED',
  in_review:   '#D97706',
  done:        '#16A34A',
};

const STATUS_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#4F46E5', '#C026D3',
] as const;

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function findColumn(
  id: UniqueIdentifier,
  state: Record<string, Task[]>,
  colIds: string[],
): string | null {
  const str = String(id);
  if (colIds.includes(str)) return str;
  for (const [colId, colTasks] of Object.entries(state)) {
    if (colTasks.some((t) => t.id === str)) return colId;
  }
  return null;
}

/* ─── Priority icon ──────────────────────────────────────────────────────────── */
function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  const cls = cn('w-3.5 h-3.5 flex-shrink-0', getPriorityColor(priority), className);
  if (priority === 'urgent') return <AlertCircle className={cls} />;
  if (priority === 'high')   return <ArrowUp    className={cls} />;
  if (priority === 'low')    return <ArrowDown  className={cls} />;
  return <ArrowRight className={cls} />;
}

/* ─── Droppable column body ──────────────────────────────────────────────────── */
function DroppableBody({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 transition-all duration-150',
        isOver && 'bg-primary/5 ring-2 ring-dashed ring-primary/30 rounded-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── Inline add ─────────────────────────────────────────────────────────────── */
function InlineAdd({
  statusId,
  onAddTask,
  onQuickCreate,
}: {
  statusId: string;
  onAddTask?: (id: string) => void;
  onQuickCreate?: (title: string, statusId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const title = value.trim();
    if (!title) { setOpen(false); setValue(''); return; }
    if (onQuickCreate) {
      setSaving(true);
      try { await onQuickCreate(title, statusId); }
      finally { setSaving(false); }
    } else if (onAddTask) {
      onAddTask(statusId);
    }
    setValue('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { if (onQuickCreate) setOpen(true); else onAddTask?.(statusId); }}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-foreground-tertiary rounded-lg hover:bg-accent/50 hover:text-foreground transition-all duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="p-2 animate-slide-up">
      <input
        autoFocus
        disabled={saving}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Task title…"
        className={cn(
          'w-full text-sm bg-background border border-border rounded-md px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150',
          saving && 'opacity-50',
        )}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave();
          if (e.key === 'Escape') { setOpen(false); setValue(''); }
        }}
        onBlur={() => { if (!saving) { setOpen(false); setValue(''); } }}
      />
      <p className="text-[10px] text-foreground-tertiary mt-1 px-1">
        Enter to save · Esc to cancel
      </p>
    </div>
  );
}

/* ─── Task card ──────────────────────────────────────────────────────────────── */
function TaskCard({
  task,
  columns,
  onTaskClick,
  onMove,
  onDelete,
  selected,
  onSelect,
  overlay = false,
}: {
  task: Task;
  columns: { id: string; label: string; color: string }[];
  onTaskClick: (t: Task) => void;
  onMove?: (taskId: string, statusId: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  selected?: boolean;
  onSelect?: (id: string) => void;
  overlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const subtasks = task.children ?? [];
  const doneSubs = subtasks.filter((s) => s.status === 'done').length;
  const hasSubs = subtasks.length > 0;
  const due = task.due_date;
  const overdue = due ? isOverdue(due) && task.status !== 'done' : false;

  const card = (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(overlay ? {} : attributes)}
      onClick={() => {
        if (onSelect && selected !== undefined) { onSelect(task.id); return; }
        onTaskClick(task);
      }}
      className={cn(
        'group relative bg-card rounded-lg p-3 border cursor-pointer select-none',
        'transition-all duration-150 animate-fade-in',
        selected
          ? 'ring-2 ring-primary border-primary/50 shadow-sm'
          : isDragging
          ? 'opacity-50 rotate-1 shadow-xl scale-105 border-border-strong'
          : 'border-border hover:shadow-md hover:border-border-strong hover:-translate-y-[1px]',
        overlay && 'shadow-2xl rotate-1 scale-105 border-border-strong opacity-95',
      )}
    >
      {/* Drag handle */}
      {!overlay && (
        <div
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing p-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3 h-3 text-foreground-muted" />
        </div>
      )}

      {/* Select checkbox */}
      {onSelect && !overlay && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
          className={cn(
            'absolute top-2 right-2 w-4 h-4 rounded border-2 flex items-center justify-center z-10 transition-all',
            selected
              ? 'bg-primary border-primary text-primary-foreground opacity-100'
              : 'border-border bg-card opacity-0 group-hover:opacity-100',
          )}
          aria-label={selected ? 'Deselect task' : 'Select task'}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>
      )}

      {/* Top row: priority + assignee */}
      <div className="flex items-start justify-between mb-2">
        <PriorityIcon priority={task.priority} />
        {task.assignees?.[0] && (
          <span
            title={task.assignees[0].name}
            className={cn(
              'w-5 h-5 rounded-full text-[9px] text-white font-bold flex items-center justify-center flex-shrink-0',
              avatarBg(task.assignees[0].id),
            )}
          >
            {initials(task.assignees[0].name)}
          </span>
        )}
      </div>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 2).map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground-secondary"
            >
              <svg width="6" height="6" aria-hidden="true">
                <circle cx="3" cy="3" r="3" fill={l.color} />
              </svg>
              {l.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-foreground-tertiary px-1">
              +{task.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2 mb-2 pr-1 text-foreground">
        {task.title}
      </p>

      {/* Subtask progress */}
      {hasSubs && (
        <div className="mb-2">
          <div className="flex justify-between text-[11px] text-foreground-tertiary mb-1">
            <span>{doneSubs}/{subtasks.length} subtasks</span>
            <span>{Math.round((doneSubs / subtasks.length) * 100)}%</span>
          </div>
          <svg width="100%" height="4" className="rounded-full" aria-hidden="true">
            <rect width="100%" height="4" className="fill-muted" rx="2" />
            <rect
              width={`${Math.round((doneSubs / subtasks.length) * 100)}%`}
              height="4"
              className="fill-success"
              rx="2"
            />
          </svg>
        </div>
      )}

      {/* Footer metadata */}
      <div className="flex items-center gap-3 text-foreground-tertiary mt-1">
        {due && (
          <span className={cn('flex items-center gap-1 text-[11px]', overdue && 'text-destructive')}>
            <Calendar className="w-3 h-3" />
            {format(new Date(due), 'MMM d')}
          </span>
        )}
        {task.children && task.children.length > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <GitBranch className="w-3 h-3" />
            {doneSubs}/{task.children.length}
          </span>
        )}
        {task.attachments && task.attachments.length > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <Paperclip className="w-3 h-3" />
            {task.attachments.length}
          </span>
        )}
        {task.comments && task.comments.length > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <MessageSquare className="w-3 h-3" />
            {task.comments.length}
          </span>
        )}
        {task.estimate != null && (
          <span className="ml-auto text-[11px] bg-muted px-1.5 py-0.5 rounded font-medium">
            {task.estimate}pt
          </span>
        )}
      </div>
    </div>
  );

  if (overlay) return card;

  return (
    <ContextMenu>
      <ContextMenuTrigger>{card}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onTaskClick(task)}>Open task</ContextMenuItem>
        <ContextMenuItem onClick={() => {
          void navigator.clipboard.writeText(window.location.href + `?task=${task.id}`);
        }}>
          Copy link
        </ContextMenuItem>
        {onMove && columns.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to…</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {columns.map((col) => (
                <ContextMenuItem
                  key={col.id}
                  onClick={() => { void onMove(task.id, col.id); }}
                >
                  <svg width="6" height="6" className="flex-shrink-0">
                    <circle cx="3" cy="3" r="3" fill={col.color} />
                  </svg>
                  {col.label}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        {onDelete && (
          <ContextMenuItem
            variant="destructive"
            onClick={() => { void onDelete(task.id); }}
          >
            Delete task
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ─── Add-status column ──────────────────────────────────────────────────────── */
function AddStatusColumn({ onAdd }: { onAdd?: (name: string, color: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(STATUS_COLORS[0]);
  const [saving, setSaving] = useState(false);

  if (!onAdd) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onAdd(name.trim(), color); }
    finally {
      setSaving(false);
      setOpen(false);
      setName('');
      setColor(STATUS_COLORS[0]);
    }
  };

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        className="min-w-[272px] max-w-[272px] h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-foreground-tertiary cursor-pointer hover:bg-accent/30 hover:border-border-strong hover:text-foreground transition-all duration-150 flex-shrink-0"
      >
        <Plus className="w-4 h-4" />
        Add status
      </div>
    );
  }

  return (
    <div className="min-w-[272px] max-w-[272px] bg-background-secondary rounded-xl border border-border p-3 animate-slide-up flex-shrink-0">
      <input
        autoFocus
        disabled={saving}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Status name…"
        className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleCreate();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="flex gap-1.5 mt-2">
        {STATUS_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              'w-5 h-5 rounded-full transition-transform flex-shrink-0',
              color === c && 'scale-125 ring-2 ring-offset-1 ring-primary',
            )}
            aria-label={`Select color ${c}`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="10" fill={c} />
            </svg>
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="flex-1"
          disabled={saving || !name.trim()}
          onClick={() => void handleCreate()}
        >
          {saving ? 'Adding…' : 'Add'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ─── Main board ─────────────────────────────────────────────────────────────── */
export default function KanbanBoard({
  tasks,
  columns,
  onReorder,
  onTaskClick,
  onAddTask,
  onQuickCreate,
  onMoveTask,
  onDeleteTask,
  onAddStatus,
  selectedIds,
  onSelectTask,
  loading = false,
}: Props) {
  /* ── DnD state ──────────────────────────────────────────────────────────── */
  const [dragState, setDragState] = useState<Record<string, Task[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const displayTasks = dragState ?? tasks;

  const colDefs: { id: string; label: string; color: string }[] = columns?.length
    ? columns.map((s) => ({ id: s.id, label: s.name, color: s.color }))
    : DEFAULT_COLUMNS.map((c) => ({ id: c, label: DEFAULT_LABELS[c], color: DEFAULT_COLORS[c] }));

  const colIds = colDefs.map((c) => c.id);

  const activeTask = activeId
    ? Object.values(displayTasks).flat().find((t) => t.id === activeId) ?? null
    : null;

  /* ── Sensors ──────────────────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ── DnD handlers ──────────────────────────────────────────────────────── */
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    // Copy current tasks into dragState for optimistic updates
    setDragState(
      Object.fromEntries(Object.entries(tasks).map(([k, v]) => [k, [...v]])),
    );
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragState) return;
    const activeIdStr = String(active.id);
    const overIdStr   = String(over.id);

    const sourceCol = findColumn(activeIdStr, dragState, colIds);
    const destCol   = findColumn(overIdStr,   dragState, colIds);

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    setDragState((prev) => {
      if (!prev) return prev;
      const task = prev[sourceCol].find((t) => t.id === activeIdStr);
      if (!task) return prev;

      const destTasks = prev[destCol] ?? [];
      const insertAt  = destTasks.findIndex((t) => t.id === overIdStr);

      return {
        ...prev,
        [sourceCol]: prev[sourceCol].filter((t) => t.id !== activeIdStr),
        [destCol]: [
          ...destTasks.slice(0, insertAt === -1 ? destTasks.length : insertAt),
          { ...task, project_status_id: columns ? destCol : task.project_status_id, status: task.status },
          ...destTasks.slice(insertAt === -1 ? destTasks.length : insertAt),
        ],
      };
    });
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const currentState = dragState;
    setActiveId(null);
    setDragState(null);

    if (!over || !currentState) return;

    const activeIdStr = String(active.id);
    const overIdStr   = String(over.id);

    // Handle same-column reorder (dragOver didn't move it, so we do it here)
    const sourceCol = findColumn(activeIdStr, currentState, colIds);
    const destCol   = findColumn(overIdStr,   currentState, colIds);

    let finalState = currentState;

    if (sourceCol && destCol && sourceCol === destCol) {
      const col = [...(currentState[sourceCol] ?? [])];
      const fromIdx = col.findIndex((t) => t.id === activeIdStr);
      const toIdx   = col.findIndex((t) => t.id === overIdStr);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        const [moved] = col.splice(fromIdx, 1);
        col.splice(toIdx, 0, moved);
        finalState = { ...currentState, [sourceCol]: col };
      }
    }

    const reorderItems: ReorderItem[] = colDefs.flatMap(({ id }) =>
      (finalState[id] ?? []).map((t, idx) => ({
        id: t.id,
        status: columns
          ? (columns.find((s) => s.id === id)?.slug ?? 'todo')
          : id,
        project_status_id: columns ? id : undefined,
        position: idx + 1,
      })),
    );

    await onReorder(reorderItems);
  };

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex gap-3 px-6 py-4 items-start">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-w-[272px] max-w-[272px] flex-shrink-0 bg-background-secondary rounded-xl border border-border p-3 space-y-2"
          >
            <Skeleton className="h-5 w-24" />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => { void handleDragEnd(e); }}
    >
      <div className="flex items-start gap-3 px-6 py-4 min-h-full">

        {colDefs.map((col) => {
          const colTasks = displayTasks[col.id] ?? [];
          const taskIds  = colTasks.map((t) => t.id);

          return (
            <div
              key={col.id}
              className="group min-w-[272px] max-w-[272px] flex-shrink-0 flex flex-col rounded-xl bg-background-secondary border border-border max-h-[calc(100vh-180px)]"
            >
              {/* Column accent strip */}
              <svg width="100%" height="3" className="rounded-t-xl flex-shrink-0" aria-hidden="true">
                <rect width="100%" height="3" fill={col.color} rx="2" />
              </svg>

              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg width="8" height="8" aria-hidden="true" className="flex-shrink-0">
                    <circle cx="4" cy="4" r="4" fill={col.color} />
                  </svg>
                  <span className="text-sm font-medium text-foreground truncate">{col.label}</span>
                  <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { if (onQuickCreate) return; onAddTask?.(col.id); }}
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-6 w-6 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-accent outline-none"
                      aria-label="Column options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit status</DropdownMenuItem>
                      <DropdownMenuItem>Set WIP limit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">Delete status</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Column body (droppable) */}
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <DroppableBody id={col.id} className="max-h-[calc(100vh-220px)]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      columns={colDefs}
                      onTaskClick={onTaskClick}
                      onMove={onMoveTask}
                      onDelete={onDeleteTask}
                      selected={selectedIds?.has(task.id)}
                      onSelect={onSelectTask}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg">
                      <p className="text-xs text-foreground-muted">Drop here</p>
                    </div>
                  )}
                </DroppableBody>
              </SortableContext>

              {/* Inline add */}
              <div className="px-1 pb-2 flex-shrink-0">
                <InlineAdd
                  statusId={col.id}
                  onAddTask={onAddTask}
                  onQuickCreate={onQuickCreate}
                />
              </div>
            </div>
          );
        })}

        {/* Add status column */}
        <AddStatusColumn onAdd={onAddStatus} />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            columns={colDefs}
            onTaskClick={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
