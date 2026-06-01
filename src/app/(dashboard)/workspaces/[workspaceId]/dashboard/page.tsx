'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  CheckSquare, AlertCircle, CheckCircle2, FolderOpen,
  Plus, Calendar, MoreHorizontal, LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn, formatRelativeTime, getPriorityColor, isOverdue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from '@/components/ui/priority-badge';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface DashProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  tasks_count: number;
  done_tasks_count?: number;
  updated_at?: string;
  members?: { id: string; name: string }[];
}

interface DashTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  completed?: boolean;
  project_id: string;
  project_name?: string;
}

interface ActivityItem {
  id: string;
  actor: { id: string; name: string };
  action: string;
  subject: string;
  type: 'done' | 'created' | 'commented' | 'assigned' | 'updated';
  created_at: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const PROJECT_COLORS = [
  '#7C3AED','#2563EB','#059669','#D97706',
  '#DC2626','#0891B2','#4F46E5','#C026D3',
] as const;

function projectColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function urgencyColor(due: string): string {
  const d = new Date(due);
  if (isToday(d)) return 'text-destructive';
  if (isTomorrow(d)) return 'text-warning';
  return 'text-foreground-tertiary';
}

function dayLabel(due: string): string {
  const d = new Date(due);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE MMM d');
}

function activityAccentColor(type: ActivityItem['type']): string {
  const map: Record<string, string> = {
    done:      'bg-success',
    created:   'bg-primary',
    commented: 'bg-muted-foreground',
    assigned:  'bg-warning',
    updated:   'bg-border',
  };
  return map[type] ?? 'bg-border';
}

/* ─── Count-up animation hook ───────────────────────────────────────────────── */
function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return; // count already initialises to 0; never goes back to 0 in practice
    const steps = 30;
    const increment = target / steps;
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ─── Stat card ─────────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  trendColor,
  loading,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  trend?: string;
  trendColor?: string;
  loading: boolean;
}) {
  const display = useCountUp(loading ? 0 : value);
  if (loading) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <Card className="p-5 hover:shadow-md hover:border-border-strong transition-all duration-150">
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
        {trend && (
          <Badge variant="secondary" className={cn('text-[11px]', trendColor)}>
            {trend}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-semibold text-foreground">{display}</p>
        <p className="text-sm text-foreground-secondary mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

/* ─── Task row ──────────────────────────────────────────────────────────────── */
function TaskRow({
  task,
  projectName,
  projectColor: pColor,
  onToggle,
}: {
  task: DashTask;
  projectName: string;
  projectColor: string;
  onToggle: (id: string) => void;
}) {
  const done = task.status === 'done' || task.completed;
  return (
    <div className={cn(
      'flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-all duration-150 group',
      done && 'opacity-60',
    )}>
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(task.id)}
        className="flex-shrink-0"
      />
      <span className={cn(
        'flex-1 text-sm font-medium transition-all duration-300 truncate',
        done && 'line-through text-foreground-tertiary',
      )}>
        {task.title}
      </span>

      {/* Project badge */}
      <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs text-foreground-secondary flex-shrink-0">
        <svg width="6" height="6" aria-hidden="true">
          <circle cx="3" cy="3" r="3" fill={pColor} />
        </svg>
        <span className="truncate max-w-[80px]">{projectName}</span>
      </span>

      {/* Due date (visible on hover) */}
      {task.due_date && (
        <span className={cn(
          'text-xs hidden group-hover:inline-flex items-center gap-1 flex-shrink-0',
          isOverdue(task.due_date) ? 'text-destructive' : 'text-foreground-tertiary',
        )}>
          <Calendar className="w-3 h-3" />
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}

      {/* Priority */}
      <PriorityBadge priority={task.priority} showLabel={false} className={cn('flex-shrink-0', getPriorityColor(task.priority))} />
    </div>
  );
}

/* ─── Project list item (right panel) ──────────────────────────────────────── */
function ProjectListItem({ project, workspaceId }: { project: DashProject; workspaceId: string }) {
  const router = useRouter();
  const color = projectColor(project.id);
  const total = project.tasks_count ?? 0;
  const done = project.done_tasks_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project.id}`)}
        className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-150 text-left"
      >
        <svg width="8" height="8" className="flex-shrink-0" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill={color} />
        </svg>
        <span className="flex-1 text-sm font-medium truncate">{project.name}</span>
        <span className="text-xs text-foreground-tertiary flex-shrink-0">
          {total > 0 ? `${total - done} open` : '—'}
        </span>
      </button>
      <Progress value={pct} className="h-[2px] mt-0.5 mx-3" />
    </div>
  );
}

/* ─── Project card (bottom grid) ───────────────────────────────────────────── */
function ProjectCard({ project, workspaceId }: { project: DashProject; workspaceId: string }) {
  const router = useRouter();
  const color = projectColor(project.id);
  const total = project.tasks_count ?? 0;
  const done = project.done_tasks_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const members = project.members ?? [];

  return (
    <Card
      className="group relative overflow-hidden hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 cursor-pointer p-0"
      onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project.id}`)}
    >
      {/* Top accent bar via SVG */}
      <svg width="100%" height="4" className="block" aria-hidden="true">
        <rect width="100%" height="4" fill={color} />
      </svg>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold leading-tight text-foreground flex-1 mr-2 truncate">
            {project.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-md',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'text-foreground-muted hover:text-foreground hover:bg-accent outline-none',
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workspaces/${workspaceId}/projects/${project.id}`); }}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workspaces/${workspaceId}/projects/${project.id}/settings`); }}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={(e) => e.stopPropagation()}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground-secondary line-clamp-2 mb-4 min-h-[2.5rem]">
          {project.description ?? 'No description'}
        </p>

        {/* Progress */}
        <Progress value={pct} className="h-1.5 mb-2" />
        <div className="flex items-center justify-between text-xs text-foreground-tertiary mb-3">
          <span>{pct}% complete</span>
          <span>{total - done} open tasks</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {members.length > 0 ? (
            <div className="flex -space-x-1.5">
              {members.slice(0, 4).map((m) => (
                <UserAvatar key={m.id} name={m.name} id={m.id} size="xs" />
              ))}
              {members.length > 4 && (
                <span className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center text-[9px] text-foreground-secondary ring-1 ring-background">
                  +{members.length - 4}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-foreground-muted">No members</span>
          )}
          {project.updated_at && (
            <span className="text-xs text-foreground-tertiary" suppressHydrationWarning>
              Updated {formatRelativeTime(project.updated_at)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─── Section header ────────────────────────────────────────────────────────── */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [projects, setProjects] = useState<DashProject[]>([]);
  const [tasks, setTasks] = useState<DashTask[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  // Start loading only when a user id is already available at mount
  const [loadingTasks, setLoadingTasks] = useState(() => !!user?.id);
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'tasks'>('updated');


  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  // Extract to a primitive so the effect dep array doesn't hold the whole user object
  const userId = user?.id;

  useEffect(() => {
    // All setState calls happen inside .then / .catch / .finally — never synchronously
    api.get<DashProject[]>(`/workspaces/${workspaceId}/projects`)
      .then((r) => setProjects(r.data ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));

    if (userId) {
      api.get<DashTask[]>(`/workspaces/${workspaceId}/tasks`, {
        params: { assignee_id: userId, per_page: 10, status: 'open' },
      })
        .then((r) => setTasks(Array.isArray(r.data) ? r.data : []))
        .catch(() => setTasks([]))
        .finally(() => setLoadingTasks(false));
    }

    api.get(`/workspaces/${workspaceId}/activity`, { params: { limit: 8 } })
      .then((r) => {
        const items = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        setActivity(Array.isArray(items) ? items : []);
      })
      .catch(() => setActivity([]));
  }, [workspaceId, userId]);

  /* ── Computed stats ─────────────────────────────────────────────────────── */
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const overdueTasks = tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'done').length;
  // Completed tasks (best-effort — no completed_at in type)
  const completedThisWeek = tasks.filter((t) => t.status === 'done').length;

  /* ── Task completion toggle ─────────────────────────────────────────────── */
  const handleToggle = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId
        ? { ...t, status: t.status === 'done' ? 'todo' : 'done' }
        : t,
    ));
    try {
      const task = tasks.find((t) => t.id === taskId);
      const newStatus = task?.status === 'done' ? 'todo' : 'done';
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'done' ? 'todo' : 'done' }
          : t,
      ));
    }
  }, [tasks]);

  /* ── Project map (for task rows) ────────────────────────────────────────── */
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  /* ── Sorted projects ────────────────────────────────────────────────────── */
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'tasks') return (b.tasks_count ?? 0) - (a.tasks_count ?? 0);
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  }), [projects, sortBy]);

  /* ── Upcoming deadlines ─────────────────────────────────────────────────── */
  const upcoming = useMemo(() => tasks
    .filter((t) => t.due_date && t.status !== 'done')
    .sort((a, b) => (a.due_date ?? '') < (b.due_date ?? '') ? -1 : 1)
    .slice(0, 8),
    [tasks],
  );

  // Group by day label
  const upcomingGroups: { label: string; tasks: DashTask[] }[] = [];
  upcoming.forEach((t) => {
    const label = t.due_date ? dayLabel(t.due_date) : 'No date';
    const existing = upcomingGroups.find((g) => g.label === label);
    if (existing) existing.tasks.push(t);
    else upcomingGroups.push({ label, tasks: [t] });
  });

  const loading = loadingProjects;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">

      {/* ── Section 1: Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" suppressHydrationWarning>
            {greeting()}, {user?.name?.split(' ')[0] ?? ''}
          </h1>
          <p className="text-sm text-foreground-tertiary mt-1" suppressHydrationWarning>
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New task
          </Button>
          <Button size="sm" onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New project
          </Button>
        </div>
      </div>

      {/* ── Section 2: Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckSquare}
          iconBg="bg-primary-subtle"
          iconColor="text-primary"
          value={openTasks}
          label="Open tasks"
          trend="+3 this week"
          trendColor="text-success"
          loading={loadingTasks}
        />
        <StatCard
          icon={AlertCircle}
          iconBg="bg-destructive-subtle"
          iconColor="text-destructive"
          value={overdueTasks}
          label="Overdue"
          trend={overdueTasks === 0 ? 'All clear' : undefined}
          trendColor="text-success"
          loading={loadingTasks}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-success-subtle"
          iconColor="text-success"
          value={completedThisWeek}
          label="Completed this week"
          trend="+5 vs last week"
          trendColor="text-success"
          loading={loadingTasks}
        />
        <StatCard
          icon={FolderOpen}
          iconBg="bg-primary-subtle"
          iconColor="text-primary"
          value={activeProjects}
          label="Active projects"
          loading={loadingProjects}
        />
      </div>

      {/* ── Section 3: Two-column ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* My tasks */}
          <div>
            <SectionHeader
              title="My tasks"
              action={
                <Button variant="ghost" size="sm" className="text-xs h-7"
                  onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
                  View all
                </Button>
              }
            />

            {loadingTasks ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="w-8 h-8 text-foreground-muted mb-2" />
                <p className="text-sm font-medium text-foreground-secondary mb-0.5">No tasks assigned to you</p>
                <p className="text-xs text-foreground-tertiary mb-3">Tasks assigned to you will appear here.</p>
                <Button size="sm" variant="outline"
                  onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
                  Browse projects
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {tasks.map((t) => {
                  const proj = projectMap[t.project_id];
                  const pName = t.project_name ?? proj?.name ?? 'Unknown';
                  const pColor = projectColor(t.project_id);
                  return (
                    <TaskRow
                      key={t.id}
                      task={t}
                      projectName={pName}
                      projectColor={pColor}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <SectionHeader title="Recent activity" />

            {activity.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">No recent activity.</p>
            ) : (
              <>
                <div className="space-y-0.5">
                  {activity.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex gap-3 py-2.5 animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <UserAvatar name={item.actor.name} id={item.actor.id} size="xs" className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{item.actor.name}</span>
                          {' '}{item.action}{' '}
                          <span className="font-medium">{item.subject}</span>
                        </p>
                        <p className="text-xs text-foreground-tertiary mt-0.5" suppressHydrationWarning>
                          {formatRelativeTime(item.created_at)}
                        </p>
                      </div>
                      <div className={cn('w-0.5 rounded-full self-stretch flex-shrink-0', activityAccentColor(item.type))} />
                    </div>
                  ))}
                </div>
                <button type="button"
                  className="text-xs text-primary hover:underline mt-3 block"
                  onClick={() => {}}>
                  View all activity →
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT ────────────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* My projects */}
          <div>
            <SectionHeader
              title="Projects"
              action={
                <Button size="sm" variant="ghost" className="text-xs h-7"
                  onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />New
                </Button>
              }
            />

            {loadingProjects ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-4">No projects yet.</p>
            ) : (
              <div className="space-y-0.5">
                {projects.slice(0, 6).map((p) => (
                  <ProjectListItem key={p.id} project={p} workspaceId={workspaceId} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div>
            <SectionHeader title="Due soon" />

            {upcoming.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-4">
                {loadingTasks ? 'Loading…' : 'No upcoming deadlines.'}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingGroups.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <Separator className="my-2" />}
                    <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider py-1">
                      {group.label}
                    </p>
                    {group.tasks.map((t) => {
                      const proj = projectMap[t.project_id];
                      return (
                        <div key={t.id} className="flex items-center gap-2 py-1.5">
                          <span className={cn('text-xs font-medium w-16 flex-shrink-0', urgencyColor(t.due_date!))}>
                            {group.label}
                          </span>
                          <span className="text-sm flex-1 truncate text-foreground">{t.title}</span>
                          {proj && (
                            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                              {proj.name}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4: All projects grid ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
            All projects
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs text-foreground-secondary hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors outline-none">
              Sort: {sortBy === 'updated' ? 'Last updated' : sortBy === 'name' ? 'Name' : 'Most tasks'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setSortBy('updated')}>Last updated</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('tasks')}>Most tasks</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mb-3">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground-secondary mb-1">No projects yet</p>
            <p className="text-xs text-foreground-tertiary mb-4">Create your first project to get started.</p>
            <Button size="sm" onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} workspaceId={workspaceId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
