'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ChevronLeft, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { cn, initials } from '@/lib/utils';
import type { BurndownData, Task } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Progress, ProgressTrack, ProgressIndicator,
} from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface SprintDetail {
  id: string;
  name: string;
  goal?: string;
  status: 'planning' | 'active' | 'completed';
  start_date?: string;
  end_date?: string;
  total_points: number;
  completed_points: number;
  open_tasks_count: number;
  tasks_count: number;
  velocity?: number;
}

interface MemberVelocity {
  id: string;
  name: string;
  completed_points: number;
  tasks_count: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p: { name: string; value: number; stroke: string }, i: number) => (
        <p key={i} className="flex items-center gap-1.5">
          <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
            <circle cx="3" cy="3" r="3" fill={p.stroke} />
          </svg>
          {p.name}: {p.value} pts
        </p>
      ))}
    </div>
  );
}

export default function SprintDetailPage() {
  const { workspaceId, projectId, sprintId } = useParams<{
    workspaceId: string;
    projectId: string;
    sprintId: string;
  }>();
  const router = useRouter();

  const [sprint, setSprint] = useState<SprintDetail | null>(null);
  const [burndown, setBurndown] = useState<BurndownData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memberVelocity, setMemberVelocity] = useState<MemberVelocity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editName, setEditName] = useState('');
  const [moveTarget, setMoveTarget] = useState('backlog');
  const [otherSprints, setOtherSprints] = useState<{ id: string; name: string }[]>([]);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<SprintDetail>(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}`),
      api.get<Task[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        params: { sprint_id: sprintId },
      }),
    ])
      .then(([s, t]) => {
        setSprint(s.data);
        setEditName(s.data.name);
        setTasks(t.data ?? []);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    api.get<BurndownData>(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/burndown`)
      .then((r) => setBurndown(r.data))
      .catch(() => {});

    api.get<MemberVelocity[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/velocity`)
      .then((r) => setMemberVelocity(r.data))
      .catch(() => {});

    api.get<{ id: string; name: string }[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setOtherSprints((r.data ?? []).filter((s) => s.id !== sprintId)))
      .catch(() => {});
  }, [workspaceId, projectId, sprintId, refreshKey]);

  const saveName = () => {
    if (!sprint || !editName.trim() || editName === sprint.name) return;
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}`, {
      name: editName.trim(),
    }).then(() => setSprint((s) => s ? { ...s, name: editName.trim() } : s))
      .catch(() => { setEditName(sprint.name); toast.error('Failed to save'); });
  };

  const handleNameChange = (v: string) => {
    setEditName(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveName, 1000);
  };

  const startSprint = () => {
    setStarting(true);
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}`, {
      status: 'active',
    }).then(() => setSprint((s) => s ? { ...s, status: 'active' } : s))
      .catch(() => toast.error('Failed to start sprint'))
      .finally(() => setStarting(false));
  };

  const completeSprint = () => {
    setCompleting(true);
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/complete`, {
      move_to: moveTarget === 'backlog' ? null : moveTarget,
    }).then(() => {
      toast.success('Sprint completed');
      router.push(`/workspaces/${workspaceId}/projects/${projectId}`);
    }).catch(() => { toast.error('Failed to complete sprint'); setCompleting(false); });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 p-4 bg-destructive-subtle border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load sprint.
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive"
            onClick={() => { setLoading(true); setError(false); setRefreshKey((k) => k + 1); }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const progressPct = sprint.total_points > 0
    ? Math.round((sprint.completed_points / sprint.total_points) * 100)
    : 0;

  const burndownChartData = burndown?.daily.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    Actual: d.remaining_points,
    Ideal: d.ideal_points,
  })) ?? [];

  const doneTasks = tasks.filter((t) => t.project_status?.is_done || t.status === 'done');
  const openTasks = tasks.filter((t) => !t.project_status?.is_done && t.status !== 'done');

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-fade-in">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}`)}
        className="flex items-center gap-1.5 text-sm text-foreground-tertiary hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to project
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0 mr-4">
          <input
            value={editName}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={saveName}
            aria-label="Sprint name"
            className="text-2xl font-semibold bg-transparent border-none outline-none focus:underline w-full"
          />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {sprint.status}
            </Badge>
            {sprint.start_date && sprint.end_date && (
              <span className="text-sm text-foreground-tertiary">
                {format(new Date(sprint.start_date), 'MMM d')}
                {' – '}
                {format(new Date(sprint.end_date), 'MMM d, yyyy')}
              </span>
            )}
            {sprint.goal && (
              <span className="text-xs text-foreground-tertiary italic">{sprint.goal}</span>
            )}
          </div>

          {sprint.total_points > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <Progress value={progressPct} className="w-48">
                <ProgressTrack className="h-2">
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
              <span className="text-sm text-foreground-secondary">
                {sprint.completed_points} / {sprint.total_points} pts
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {sprint.status === 'planning' && (
            <Button onClick={startSprint} disabled={starting}>
              {starting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              <Zap className="w-4 h-4 mr-1.5" />Start sprint
            </Button>
          )}
          {sprint.status === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" />}>
                Complete sprint
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete sprint?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {sprint.open_tasks_count > 0
                      ? `${sprint.open_tasks_count} task${sprint.open_tasks_count > 1 ? 's are' : ' is'} not done. Where should they go?`
                      : 'All tasks are done. Complete this sprint?'
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {sprint.open_tasks_count > 0 && (
                  <Select value={moveTarget} onValueChange={(v) => { if (v) setMoveTarget(v); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Move to…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      {otherSprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={completeSprint} disabled={completing}>
                    {completing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Complete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Body — 2/3 + 1/3 columns */}
      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Task list */}
        <div className="col-span-2 space-y-2">
          {/* Open tasks */}
          {openTasks.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary mb-2">
                Open ({openTasks.length})
              </p>
              {openTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary mb-2">
                Done ({doneTasks.length})
              </p>
              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} done />
              ))}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="w-10 h-10 text-foreground-muted mb-3" />
              <p className="text-sm font-medium text-foreground-secondary mb-1">No tasks in this sprint</p>
              <p className="text-xs text-foreground-tertiary">Add tasks from the backlog or board</p>
            </div>
          )}
        </div>

        {/* RIGHT: Charts + stats */}
        <div className="space-y-4">
          {/* Burndown chart */}
          {burndownChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium">Burndown</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={burndownChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#888' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Ideal"
                      stroke="#888"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="Actual"
                      stroke="hsl(var(--primary))"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-tertiary">Total tasks</span>
                <span className="font-medium">{sprint.tasks_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-tertiary">Completed</span>
                <span className="font-medium text-success">{doneTasks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-tertiary">Open</span>
                <span className="font-medium">{openTasks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-tertiary">Story points</span>
                <span className="font-medium">
                  {sprint.completed_points} / {sprint.total_points}
                </span>
              </div>
              {sprint.velocity != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-tertiary">Velocity</span>
                  <span className="font-medium">{sprint.velocity} pts</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member velocity */}
          {memberVelocity.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium">Member velocity</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {memberVelocity.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar size="sm" className="flex-shrink-0">
                      <AvatarFallback className="text-[9px]">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-xs truncate">{m.name}</span>
                    <span className="text-xs text-foreground-tertiary flex-shrink-0">
                      {m.completed_points} pts
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, done = false }: { task: Task; done?: boolean }) {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const priorityColors: Record<string, string> = {
    urgent: 'bg-destructive',
    high: 'bg-warning',
    medium: 'bg-primary',
    low: 'bg-foreground-muted',
  };

  return (
    <div
      onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}?task=${task.id}`)}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:border-border-strong hover:bg-accent/30 cursor-pointer transition-all group mb-1',
        done && 'opacity-60',
      )}
    >
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityColors[task.priority] ?? 'bg-muted-foreground')} />
      <span className={cn('flex-1 text-sm truncate', done && 'line-through text-foreground-tertiary')}>
        {task.title}
      </span>
      {task.estimate != null && (
        <span className="text-xs text-foreground-muted bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
          {task.estimate}pt
        </span>
      )}
      <div className="flex -space-x-1 flex-shrink-0">
        {task.assignees.slice(0, 2).map((a) => (
          <Avatar key={a.id} size="sm" className="border border-background">
            <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  );
}
