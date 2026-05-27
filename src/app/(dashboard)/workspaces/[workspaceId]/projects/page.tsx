'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, Plus, ChevronRight, LayoutGrid, Clock } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  tasks_count: number;
  done_tasks_count?: number;
  updated_at?: string;
}

/** Deterministic project accent colour from ID */
const PROJECT_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const;

function projectColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ─── Skeleton card ─────────────────────────────────────────────────────────── */
function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Project card ──────────────────────────────────────────────────────────── */
function ProjectCard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const router = useRouter();
  const total = project.tasks_count ?? 0;
  const done = project.done_tasks_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const colorCls = projectColor(project.id);

  const statusLabel = project.status === 'active' ? 'Active' : project.status;
  const statusCls = project.status === 'active'
    ? 'text-success bg-success-subtle'
    : 'text-foreground-tertiary bg-muted';

  return (
    <button
      type="button"
      onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project.id}`)}
      className={cn(
        'group text-left rounded-xl border border-border bg-card p-5',
        'hover:border-border-strong hover:shadow-sm transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Colour avatar */}
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorCls)}>
          <FolderKanban className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <ChevronRight className="w-4 h-4 text-foreground-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {project.description && (
            <p className="text-xs text-foreground-tertiary mt-0.5 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-3">
          <svg width="100%" height="6" className="rounded-full overflow-hidden" aria-hidden="true">
            <rect x="0" y="0" width="100%" height="6" className="fill-muted" />
            <rect x="0" y="0" width={`${pct}%`} height="6" className="fill-primary" rx="3" />
          </svg>
          <p className="text-[11px] text-foreground-muted mt-1">
            {done}/{total} tasks · {pct}% done
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {project.updated_at ? (
          <span className="flex items-center gap-1 text-[11px] text-foreground-muted">
            <Clock className="w-3 h-3" />
            {relativeTime(project.updated_at)}
          </span>
        ) : (
          <span className="text-[11px] text-foreground-muted">
            {total > 0 ? `${total} task${total !== 1 ? 's' : ''}` : 'No tasks yet'}
          </span>
        )}

        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', statusCls)}>
          {statusLabel}
        </span>
      </div>
    </button>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────────────── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-subtle flex items-center justify-center mb-4">
        <LayoutGrid className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No projects yet</h3>
      <p className="text-sm text-foreground-tertiary mb-6 max-w-xs">
        Create your first project to start organising tasks on a Kanban board.
      </p>
      <Button onClick={onNew}>
        <Plus className="w-4 h-4 mr-1.5" />
        New Project
      </Button>
    </div>
  );
}

/* ─── New Project Dialog ────────────────────────────────────────────────────── */
function NewProjectDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  onCreate: (p: Project) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setDescription(''); setError(''); };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/projects`, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreate(data);
      reset();
      onOpenChange(false);
    } catch {
      setError('Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label htmlFor="proj-name" className="text-sm font-medium text-foreground">
              Project name <span className="text-destructive">*</span>
            </label>
            <Input
              id="proj-name"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="proj-desc" className="text-sm font-medium text-foreground">
              Description <span className="text-foreground-muted font-normal">(optional)</span>
            </label>
            <Input
              id="proj-desc"
              placeholder="Short description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProjects = useCallback(() => {
    api
      .get(`/workspaces/${workspaceId}/projects`)
      .then((r) => setProjects(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreated = (project: Project) => setProjects((prev) => [project, ...prev]);

  return (
    <>
      <div className="h-full flex flex-col">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Projects</h1>
            <p className="text-sm text-foreground-tertiary mt-0.5">
              {loading ? '' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onNew={() => setDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} workspaceId={workspaceId} />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        onCreate={handleCreated}
      />
    </>
  );
}
