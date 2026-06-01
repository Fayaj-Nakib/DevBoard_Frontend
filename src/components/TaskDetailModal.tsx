'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, ArrowUpRight, Link2, MoreHorizontal, Copy, FolderInput, GitBranch,
  Archive, Trash2, ChevronDown, UserPlus, Check,
  AlertCircle, ArrowUp, ArrowRight, ArrowDown,
  Calendar, Bold, Italic, Code, List,
  Plus, Upload, Paperclip, FileText, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  cn, getStatusColor, initials, avatarBg, isOverdue, formatRelativeTime,
} from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TimeTracker from '@/components/TimeTracker';
import type {
  Task, Comment, Milestone, Sprint,
  WorkspaceMember, ActivityEntry, ActivityPage,
  CustomFieldValue, CustomFieldType, ProjectStatus,
} from '@/types';

/* ─── Props ────────────────────────────────────────────────────────────────── */
interface Props {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}

/* ─── Activity action formatter ───────────────────────────────────────────── */
function formatActivityAction(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case 'task_created':   return 'created this task';
    case 'task_deleted':   return 'deleted this task';
    case 'task_updated': {
      const field = payload.field as string | undefined;
      if (field === 'status')      return `changed status to "${String(payload.to ?? '')}"`;
      if (field === 'title')       return 'renamed this task';
      if (field === 'description') return 'updated the description';
      if (field === 'priority')    return `changed priority to "${String(payload.to ?? '')}"`;
      return `updated ${field ?? 'this task'}`;
    }
    case 'assignee_added':   return `assigned ${String(payload.assignee_name ?? 'someone')}`;
    case 'assignee_removed': return `unassigned ${String(payload.assignee_name ?? 'someone')}`;
    case 'comment_added':    return 'posted a comment';
    case 'attachment_added': return `attached "${String(payload.file_name ?? 'a file')}"`;
    case 'attachment_deleted': return 'removed an attachment';
    default: return action.replace(/_/g, ' ');
  }
}

/* ─── Priority config ──────────────────────────────────────────────────────── */
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', icon: AlertCircle, cls: 'text-destructive' },
  high:   { label: 'High',   icon: ArrowUp,     cls: 'text-warning'     },
  medium: { label: 'Medium', icon: ArrowRight,  cls: 'text-primary'     },
  low:    { label: 'Low',    icon: ArrowDown,   cls: 'text-foreground-muted' },
} as const;

/* ─── Small helpers ────────────────────────────────────────────────────────── */
function MemberAvatar({
  name, id, size = 'sm',
}: { name: string; id: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[10px]';
  return (
    <Avatar className={cn(dim, avatarBg(id))}>
      <AvatarFallback className={dim}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function MetaField({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function TaskDetailModal({
  taskId, workspaceId, projectId, onClose, onUpdate,
}: Props) {
  const { user } = useAuth();

  /* ── Core data ─────────────────────────────────────────────────────────── */
  const [task, setTask] = useState<Task | null>(null);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  /* ── Editable fields (own state — not synced on refresh) ───────────────── */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descFocused, setDescFocused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  /* ── UI flags ──────────────────────────────────────────────────────────── */
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  /* ── Refs ──────────────────────────────────────────────────────────────── */
  const titleRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Refresh trigger (incremented by update ops, NOT syncing title/desc) ─ */
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Effect 1: initial load (also syncs title/description) ────────────── */
  useEffect(() => {
    api.get<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => {
        setTask(r.data);
        setTitle(r.data.title);
        setDescription(r.data.description ?? '');
      })
      .catch(() => {});

    api.get<ProjectStatus[]>(`/workspaces/${workspaceId}/projects/${projectId}/statuses`)
      .then((r) => setProjectStatuses(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
      .then((r) => setMembers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    api.get<Milestone[]>(`/workspaces/${workspaceId}/projects/${projectId}/milestones`)
      .then((r) => setMilestones(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    api.get<ActivityPage>(`/tasks/${taskId}/activity`)
      .then((r) => setActivity(r.data.data ?? []))
      .catch(() => {});
  }, [taskId, workspaceId, projectId]);

  /* ── Effect 2: refresh (skips title/description to preserve edits) ─────── */
  useEffect(() => {
    if (refreshKey === 0) return;
    api.get<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => setTask(r.data))
      .catch(() => {});
    api.get<ActivityPage>(`/tasks/${taskId}/activity`)
      .then((r) => setActivity(r.data.data ?? []))
      .catch(() => {});
  }, [taskId, workspaceId, projectId, refreshKey]);

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const refresh = () => { setRefreshKey((k) => k + 1); onUpdate(); };

  const immediateUpdate = async (patch: Record<string, unknown>) => {
    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        patch,
      );
      refresh();
    } catch {
      toast.error('Update failed');
    }
  };

  const debouncedSave = (patch: Record<string, unknown>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        patch,
      )
        .then(() => { setSaveStatus('saved'); refresh(); })
        .catch(() => { setSaveStatus('idle'); toast.error('Failed to save'); });
    }, 800);
  };

  /* ── Status / priority / assignee / label handlers ─────────────────────── */
  const updateStatus = async (statusId: string) => {
    const ps = projectStatuses.find((s) => s.id === statusId);
    await immediateUpdate({
      project_status_id: statusId,
      status: ps?.slug ?? 'todo',
    });
  };

  const toggleAssignee = async (memberId: string) => {
    if (!task) return;
    const current = (task.assignees ?? []).map((a) => a.id);
    const next = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId];
    await immediateUpdate({ assignee_ids: next });
  };

  const toggleLabel = async (labelId: string) => {
    if (!task) return;
    const hasIt = (task.labels ?? []).some((l) => l.id === labelId);
    try {
      if (hasIt) {
        await api.delete(`/tasks/${taskId}/labels/${labelId}`);
      } else {
        await api.post(`/tasks/${taskId}/labels/${labelId}`);
      }
      refresh();
    } catch {
      toast.error('Label update failed');
    }
  };

  /* ── Sub-tasks ─────────────────────────────────────────────────────────── */
  const createSubtask = async (subtaskTitle: string) => {
    if (!subtaskTitle.trim()) return;
    try {
      await api.post(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks`,
        { title: subtaskTitle.trim(), priority: 'medium' },
      );
      setAddingSubtask(false);
      refresh();
    } catch {
      toast.error('Could not create sub-task');
    }
  };

  const toggleSubtask = async (sub: Task) => {
    const next = sub.status === 'done' ? 'todo' : 'done';
    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${sub.id}`,
        { status: next },
      );
      refresh();
    } catch {
      toast.error('Could not update sub-task');
    }
  };

  /* ── Attachments ───────────────────────────────────────────────────────── */
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('file', f));
    try {
      await api.post(`/tasks/${taskId}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refresh();
    } catch {
      toast.error('Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      refresh();
    } catch {
      toast.error('Could not delete attachment');
    }
  };

  /* ── Comments ──────────────────────────────────────────────────────────── */
  const postComment = async () => {
    if (!comment.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { body: comment });
      setComment('');
      refresh();
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      refresh();
    } catch {
      toast.error('Could not delete comment');
    }
  };

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const subtasks       = task?.children ?? [];
  const doneSubtasks   = subtasks.filter((s) => s.status === 'done').length;
  const attachments    = task?.attachments ?? [];
  const comments       = task?.comments ?? [];
  const filteredMembers = members.filter(
    (m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  const priorityCfg = PRIORITY_CONFIG[(task?.priority ?? 'medium') as keyof typeof PRIORITY_CONFIG]
    ?? PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityCfg.icon;

  /* ── Loading skeleton ──────────────────────────────────────────────────── */
  if (!task) {
    return (
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0 overflow-hidden"
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-foreground-tertiary animate-pulse">Loading…</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0 overflow-hidden"
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="h-12 px-5 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
          {/* LEFT: breadcrumb + task ID + save status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-foreground-tertiary truncate">
              {task.project_status?.name ?? task.status.replace('_', ' ')}
            </span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground-secondary flex-shrink-0">
              #{taskId.slice(0, 8)}
            </span>
            {saveStatus === 'saving' && (
              <span className="text-xs text-foreground-tertiary animate-pulse flex-shrink-0">
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-success flex-shrink-0">Saved ✓</span>
            )}
          </div>

          {/* RIGHT: actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Open full page"
              onClick={() => window.open(window.location.href, '_blank')}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Copy link"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied');
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-accent transition-colors outline-none"
                aria-label="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>
                  <Copy className="w-4 h-4" />Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FolderInput className="w-4 h-4" />Move to project
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <GitBranch className="w-4 h-4" />Convert to subtask
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Archive className="w-4 h-4" />Archive
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="w-4 h-4" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Section 1 — Title */}
          <div className="px-6 pt-5 pb-3">
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                debouncedSave({ title: e.target.value });
              }}
              onBlur={() => {
                if (title !== task.title) debouncedSave({ title });
              }}
              placeholder="Task title"
              rows={1}
              className={cn(
                'w-full resize-none text-xl font-semibold leading-snug bg-transparent',
                'border-none outline-none placeholder:text-foreground-muted',
                'focus:ring-0 transition-all duration-150',
              )}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
          </div>

          {/* Section 2 — Quick row */}
          <div className="px-6 py-2 flex flex-wrap items-center gap-2">

            {/* Status selector */}
            <Popover>
              <PopoverTrigger
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  'hover:opacity-80 transition-opacity cursor-pointer outline-none',
                  getStatusColor(task.status),
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {task.project_status?.name ?? task.status.replace('_', ' ')}
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                {projectStatuses.length > 0 ? projectStatuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void updateStatus(s.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0">
                      <circle cx="4" cy="4" r="4" fill={s.color} />
                    </svg>
                    {s.name}
                    {task.project_status_id === s.id && (
                      <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                    )}
                  </button>
                )) : (
                  ['todo', 'in_progress', 'in_review', 'done'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void immediateUpdate({ status: s })}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    >
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-full', getStatusColor(s))}>
                        {s.replace('_', ' ')}
                      </span>
                      {task.status === s && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  ))
                )}
              </PopoverContent>
            </Popover>

            {/* Priority selector */}
            <Popover>
              <PopoverTrigger
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  'bg-muted hover:bg-accent transition-colors cursor-pointer outline-none',
                  priorityCfg.cls,
                )}
              >
                <PriorityIcon className="w-3 h-3" />
                {priorityCfg.label}
                <ChevronDown className="w-3 h-3 ml-0.5 text-foreground-tertiary" />
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1">
                {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => void immediateUpdate({ priority: p })}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    >
                      <Icon className={cn('w-4 h-4', cfg.cls)} />
                      {cfg.label}
                      {task.priority === p && (
                        <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                      )}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>

            {/* Assignees */}
            <Popover>
              <PopoverTrigger
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-accent transition-colors cursor-pointer outline-none"
              >
                {(task.assignees ?? []).length === 0 ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-foreground-tertiary" />
                    <span className="text-foreground-secondary">Assign</span>
                  </>
                ) : (
                  <div className="flex -space-x-1">
                    {(task.assignees ?? []).slice(0, 3).map((a) => (
                      <MemberAvatar key={a.id} name={a.name} id={a.id} />
                    ))}
                    {(task.assignees ?? []).length > 3 && (
                      <span className="w-5 h-5 rounded-full bg-muted border border-background text-[9px] flex items-center justify-center text-foreground-secondary">
                        +{(task.assignees ?? []).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2">
                <input
                  placeholder="Search members…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full text-sm bg-muted rounded px-3 py-1.5 mb-2 focus:outline-none placeholder:text-foreground-muted"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => void toggleAssignee(m.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm transition-colors"
                    >
                      <MemberAvatar name={m.name} id={m.id} size="md" />
                      <span className="text-foreground flex-1 text-left">{m.name}</span>
                      {(task.assignees ?? []).find((a) => a.id === m.id) && (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Due date */}
            <Popover>
              <PopoverTrigger
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer outline-none',
                  task.due_date && isOverdue(task.due_date)
                    ? 'bg-destructive-subtle text-destructive'
                    : 'bg-muted hover:bg-accent text-foreground-secondary',
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {task.due_date
                  ? format(new Date(task.due_date), 'MMM d')
                  : 'Due date'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <p className="text-xs text-foreground-tertiary mb-2">Due date</p>
                <input
                  type="date"
                  aria-label="Due date"
                  defaultValue={task.due_date?.substring(0, 10) ?? ''}
                  onChange={(e) => void immediateUpdate({ due_date: e.target.value || null })}
                  className="text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                />
                {task.due_date && (
                  <button
                    type="button"
                    onClick={() => void immediateUpdate({ due_date: null })}
                    className="mt-2 text-xs text-destructive hover:opacity-80 block"
                  >
                    Clear
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Section 3 — Metadata grid */}
          <div className="px-6 py-3 border-t border-border">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">

              {/* Sprint */}
              <MetaField label="Sprint">
                <Popover>
                  <PopoverTrigger className="text-sm text-foreground hover:bg-accent/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors text-left block w-full cursor-pointer outline-none">
                    {task.sprint?.name ?? <span className="text-foreground-tertiary">None</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1">
                    <button
                      type="button"
                      onClick={() => void immediateUpdate({ sprint_id: null })}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-foreground-tertiary"
                    >
                      None
                    </button>
                    {sprints.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => void immediateUpdate({ sprint_id: s.id })}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                      >
                        {s.name}
                        {task.sprint_id === s.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </MetaField>

              {/* Milestone */}
              <MetaField label="Milestone">
                <Popover>
                  <PopoverTrigger className="text-sm text-foreground hover:bg-accent/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors text-left block w-full cursor-pointer outline-none">
                    {task.milestone?.name ?? <span className="text-foreground-tertiary">None</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1">
                    <button
                      type="button"
                      onClick={() => void immediateUpdate({ milestone_id: null })}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-foreground-tertiary"
                    >
                      None
                    </button>
                    {milestones.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => void immediateUpdate({ milestone_id: m.id })}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                      >
                        {m.name}
                        {task.milestone_id === m.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </MetaField>

              {/* Start date */}
              <MetaField label="Start date">
                <Popover>
                  <PopoverTrigger className="text-sm text-foreground hover:bg-accent/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors cursor-pointer outline-none">
                    {task.started_at
                      ? format(new Date(task.started_at), 'MMM d, yyyy')
                      : <span className="text-foreground-tertiary">None</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3">
                    <input
                      type="date"
                      aria-label="Start date"
                      defaultValue={task.started_at?.substring(0, 10) ?? ''}
                      onChange={(e) => void immediateUpdate({ started_at: e.target.value || null })}
                      className="text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                    />
                  </PopoverContent>
                </Popover>
              </MetaField>

              {/* Due date (metadata) */}
              <MetaField label="Due date">
                <span className={cn(
                  'text-sm',
                  task.due_date && isOverdue(task.due_date) ? 'text-destructive' : 'text-foreground',
                )}>
                  {task.due_date
                    ? format(new Date(task.due_date), 'MMM d, yyyy')
                    : <span className="text-foreground-tertiary">None</span>}
                </span>
              </MetaField>

              {/* Story points */}
              <MetaField label="Story points">
                <Popover>
                  <PopoverTrigger className="text-sm text-foreground hover:bg-accent/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors cursor-pointer outline-none">
                    {task.estimate ?? <span className="text-foreground-tertiary">None</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-2">
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      defaultValue={task.estimate ?? ''}
                      placeholder="Points"
                      onBlur={(e) => {
                        const v = e.target.value;
                        void immediateUpdate({ estimate: v ? Number(v) : null });
                      }}
                      className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                    />
                  </PopoverContent>
                </Popover>
              </MetaField>

              {/* Reporter */}
              <MetaField label="Reporter">
                <span className="text-sm text-foreground">
                  {task.creator?.name ?? <span className="text-foreground-tertiary">—</span>}
                </span>
              </MetaField>
            </div>

            {/* Labels — full row */}
            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-1.5">
                Labels
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {(task.labels ?? []).map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border border-border bg-muted text-foreground-secondary"
                  >
                    <svg width="6" height="6" viewBox="0 0 6 6">
                      <circle cx="3" cy="3" r="3" fill={l.color} />
                    </svg>
                    {l.name}
                  </span>
                ))}
                <Popover>
                  <PopoverTrigger className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-accent transition-colors cursor-pointer outline-none text-foreground-tertiary">
                    <Plus className="w-3 h-3" />
                    Add label
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {(task.labels ?? []).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => void toggleLabel(l.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
                            <circle cx="5" cy="5" r="5" fill={l.color} />
                          </svg>
                          {l.name}
                          {(task.labels ?? []).some((tl) => tl.id === l.id) && (
                            <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                          )}
                        </button>
                      ))}
                      {(task.labels ?? []).length === 0 && (
                        <p className="text-xs text-foreground-tertiary px-2 py-1">
                          No labels on this task
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Watchers — full row */}
            {(task.watchers?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-1.5">
                  Watchers
                </p>
                <div className="flex items-center gap-1.5">
                  {(task.watchers ?? []).slice(0, 6).map((w) => (
                    <MemberAvatar key={w.id} name={w.name} id={w.id} />
                  ))}
                  {(task.watchers?.length ?? 0) > 6 && (
                    <span className="text-xs text-foreground-tertiary">
                      +{(task.watchers?.length ?? 0) - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4 — Description */}
          <div className="px-6 py-4 border-t border-border">
            <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-2">
              Description
            </p>

            {descFocused && (
              <div className="flex items-center gap-0.5 mb-2 animate-fade-in">
                {[
                  { Icon: Bold,   action: 'bold'   },
                  { Icon: Italic, action: 'italic' },
                  { Icon: Code,   action: 'code'   },
                  { Icon: Link2,  action: 'link'   },
                  { Icon: List,   action: 'list'   },
                ].map(({ Icon, action }) => (
                  <Button key={action} variant="ghost" size="icon" className="h-7 w-7">
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                ))}
              </div>
            )}

            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                debouncedSave({ description: e.target.value });
              }}
              onFocus={() => setDescFocused(true)}
              onBlur={() => {
                setDescFocused(false);
                if (description !== (task.description ?? '')) {
                  debouncedSave({ description });
                }
              }}
              placeholder="Add a description…"
              className={cn(
                'w-full resize-none text-sm bg-transparent border-none outline-none',
                'placeholder:text-foreground-muted leading-relaxed min-h-[80px]',
                'focus:ring-0',
              )}
            />
          </div>

          {/* Section 5 — Sub-tasks */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary">
                  Sub-tasks
                </p>
                {subtasks.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-foreground-secondary">
                    {doneSubtasks}/{subtasks.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setAddingSubtask(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {subtasks.length > 0 && (
              <Progress
                value={Math.round((doneSubtasks / subtasks.length) * 100)}
                className="mb-3"
              />
            )}

            <div className="space-y-0.5">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 py-1.5 group">
                  <Checkbox
                    checked={st.status === 'done'}
                    onCheckedChange={() => void toggleSubtask(st)}
                    className="flex-shrink-0"
                  />
                  <span className={cn(
                    'flex-1 text-sm transition-all',
                    st.status === 'done' && 'line-through text-foreground-tertiary opacity-60',
                  )}>
                    {st.title}
                  </span>
                  {st.assignees?.length > 0 && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MemberAvatar
                        name={st.assignees[0].name}
                        id={st.assignees[0].id}
                      />
                    </div>
                  )}
                  {st.due_date && (
                    <span className={cn(
                      'text-xs opacity-0 group-hover:opacity-100 transition-opacity',
                      isOverdue(st.due_date) ? 'text-destructive' : 'text-foreground-tertiary',
                    )}>
                      {format(new Date(st.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {addingSubtask && (
              <div className="flex items-center gap-2 mt-2 animate-slide-up">
                <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
                <input
                  autoFocus
                  placeholder="Sub-task title…"
                  className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-foreground-muted"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void createSubtask(e.currentTarget.value);
                    if (e.key === 'Escape') setAddingSubtask(false);
                  }}
                  onBlur={() => setAddingSubtask(false)}
                />
              </div>
            )}
          </div>

          {/* Section 6 — Attachments */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary">
                Attachments
                {attachments.length > 0 && (
                  <span className="ml-1 normal-case text-foreground-secondary">({attachments.length})</span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Upload file attachments"
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void uploadFiles(e.dataTransfer.files);
              }}
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center text-xs text-foreground-tertiary',
                'transition-all duration-150 mb-3',
                dragOver
                  ? 'border-primary bg-primary-subtle/20 text-primary'
                  : 'border-border',
              )}
            >
              <Paperclip className="w-4 h-4 mx-auto mb-1" />
              Drop files here
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="group relative rounded-lg overflow-hidden border border-border aspect-square bg-muted"
                  >
                    {a.mime_type?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <FileText className="w-6 h-6 text-foreground-tertiary" />
                        <span className="text-[10px] text-foreground-tertiary text-center truncate w-full">
                          {a.original_name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        aria-label="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                      </a>
                      {user?.id === a.uploaded_by && (
                        <button
                          type="button"
                          onClick={() => void deleteAttachment(a.id)}
                          className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 7 — Activity & Comments */}
          <div className="px-6 py-4 border-t border-border">
            <Tabs defaultValue="comments">
              <TabsList variant="line" className="mb-4 h-8">
                <TabsTrigger value="comments" className="text-xs">
                  Comments{comments.length > 0 ? ` (${comments.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
              </TabsList>

              {/* Comments */}
              <TabsContent value="comments">
                {/* Compose */}
                <div className="flex gap-3 mb-5">
                  {user && (
                    <Avatar size="sm" className={cn('flex-shrink-0 mt-0.5', avatarBg(user.id))}>
                      <AvatarFallback className="text-[10px] text-white">
                        {initials(user.name ?? user.email)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring transition-all">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Leave a comment… use @ to mention"
                      rows={2}
                      className="w-full p-3 text-sm outline-none resize-none bg-transparent placeholder:text-foreground-muted"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          void postComment();
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2 px-3 py-2 border-t border-border bg-muted/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setComment('')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => void postComment()}
                        disabled={postingComment || !comment.trim()}
                      >
                        {postingComment ? 'Posting…' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments list */}
                <div className="space-y-4">
                  {comments.map((c: Comment) => (
                    <div key={c.id} className="flex gap-3 group animate-fade-in">
                      <Avatar size="sm" className={cn('flex-shrink-0', avatarBg(c.user.id))}>
                        <AvatarFallback className="text-[10px] text-white">
                          {initials(c.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {c.user.name}
                          </span>
                          <span className="text-xs text-foreground-tertiary" suppressHydrationWarning>
                            {formatRelativeTime(c.created_at)}
                          </span>
                        </div>
                        <p
                          className="text-sm leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: c.body.replace(
                              /@(\w+)/g,
                              '<span class="text-primary-subtle-foreground bg-primary-subtle rounded px-0.5 font-medium">@$1</span>',
                            ),
                          }}
                        />
                        <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {user?.id === c.user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2 text-destructive"
                              onClick={() => void deleteComment(c.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-foreground-tertiary text-center py-4">
                      No comments yet.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity">
                <div className="space-y-3">
                  {activity.map((log: ActivityEntry) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <Avatar size="sm" className={cn('flex-shrink-0 mt-0.5', log.actor ? avatarBg(log.actor.id) : 'bg-muted')}>
                        <AvatarFallback className="text-[9px] text-white">
                          {log.actor ? initials(log.actor.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-medium text-foreground">
                          {log.actor?.name ?? 'System'}
                        </span>
                        {' '}
                        <span className="text-foreground-secondary">
                          {formatActivityAction(log.action, log.payload)}
                        </span>
                        {typeof log.payload.from === 'string' && typeof log.payload.to === 'string' && (
                          <span className="inline-flex items-center gap-1 text-xs ml-1">
                            <span className="bg-muted px-1.5 py-0.5 rounded line-through text-foreground-tertiary">
                              {log.payload.from}
                            </span>
                            <ArrowRight className="w-3 h-3 text-foreground-muted" />
                            <span className={cn('px-1.5 py-0.5 rounded', getStatusColor(log.payload.to))}>
                              {log.payload.to}
                            </span>
                          </span>
                        )}
                        <p className="text-xs text-foreground-tertiary mt-0.5" suppressHydrationWarning>
                          {formatRelativeTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && (
                    <p className="text-xs text-foreground-tertiary text-center py-4">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Time tracking */}
              <TabsContent value="time">
                <TimeTracker taskId={taskId} currentUserId={user?.id ?? ''} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Custom fields */}
          {(task.custom_field_values?.length ?? 0) > 0 && (
            <CustomFieldsSection
              taskId={taskId}
              values={task.custom_field_values ?? []}
              onRefresh={refresh}
            />
          )}

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Custom fields section ────────────────────────────────────────────────── */
function CustomFieldsSection({
  taskId,
  values,
  onRefresh,
}: {
  taskId: string;
  values: CustomFieldValue[];
  onRefresh: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      await api.put(`/tasks/${taskId}/custom-fields`, { values: edits });
      setEdits({});
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-4 border-t border-border">
      <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-3">
        Custom fields
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {values.map((cfv: CustomFieldValue) => {
          const def = cfv.field_definition;
          const current = edits[def.id] ?? cfv.value ?? '';
          const type = def.field_type as CustomFieldType;
          return (
            <div key={def.id}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary mb-1">
                {def.name}
              </p>
              {type === 'checkbox' ? (
                <Checkbox
                  checked={current === '1'}
                  onCheckedChange={(v) =>
                    setEdits((p) => ({ ...p, [def.id]: v ? '1' : '0' }))}
                />
              ) : type === 'select' && def.options ? (
                <select
                  title={def.name}
                  value={current}
                  onChange={(e) =>
                    setEdits((p) => ({ ...p, [def.id]: e.target.value }))}
                  className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {def.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    type === 'number' ? 'number'
                    : type === 'date' ? 'date'
                    : type === 'url' ? 'url'
                    : 'text'
                  }
                  title={def.name}
                  value={current}
                  onChange={(e) =>
                    setEdits((p) => ({ ...p, [def.id]: e.target.value }))}
                  placeholder="—"
                  className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          );
        })}
      </div>
      {Object.keys(edits).length > 0 && (
        <Button
          size="sm"
          className="mt-3 h-7 text-xs"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save fields'}
        </Button>
      )}
    </div>
  );
}
