'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

import api from '@/lib/api';
import { cn, initials, isOverdue } from '@/lib/utils';
import type { Sprint, WorkloadMember } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  workspaceId: string;
  projectId: string;
  onTaskClick: (taskId: string) => void;
}

function loadColor(total: number): string {
  if (total >= 10) return 'bg-destructive';
  if (total >= 5)  return 'bg-warning';
  return 'bg-success';
}

export default function WorkloadView({ workspaceId, projectId, onTaskClick }: Props) {
  const [members, setMembers] = useState<WorkloadMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(r.data))
      .catch(() => {});
  }, [workspaceId, projectId]);

  useEffect(() => {
    const params = sprintId ? { sprint_id: sprintId } : {};
    api.get<WorkloadMember[]>(`/workspaces/${workspaceId}/projects/${projectId}/workload`, { params })
      .then((r) => { setMembers(r.data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, sprintId, refreshKey]);

  if (loading) {
    return (
      <div className="px-6 py-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 p-4 bg-destructive-subtle border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load workload data.
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

  return (
    <div className="px-6 py-4 animate-fade-in">
      {/* Sprint filter */}
      <div className="flex items-center gap-3 mb-5">
        <select
          aria-label="Sprint filter"
          value={sprintId}
          onChange={(e) => setSprintId(e.target.value)}
          className="h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All sprints</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">👥</span>
          <p className="text-sm font-medium text-foreground-secondary mb-1">No workload data</p>
          <p className="text-xs text-foreground-tertiary">Assign tasks to members to see workload</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m) => {
            const load = m.total_tasks;
            const barColor = loadColor(load);

            return (
              <Card key={m.user.id} className="hover:border-border-strong transition-all">
                <CardContent className="p-4">
                  {/* Member header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', barColor)} />
                        <span className="text-xs text-foreground-tertiary">
                          {load} open · {m.overdue_count} overdue · {m.total_estimate} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className={cn('h-full rounded-full transition-all', barColor)}
                      style={{ width: `${Math.min((load / 15) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Collapsible task list */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-foreground-tertiary hover:text-foreground transition-colors py-1">
                      <span>Show tasks ({m.tasks.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-2">
                      {m.tasks.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onTaskClick(t.id)}
                          className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              t.status === 'done' ? 'bg-success' :
                              t.status === 'in_progress' ? 'bg-primary' :
                              t.is_overdue ? 'bg-destructive' : 'bg-muted-foreground',
                            )}
                          />
                          <span className="flex-1 truncate">{t.title}</span>
                          {t.due_date && (
                            <span className={cn(
                              'flex-shrink-0',
                              isOverdue(t.due_date) ? 'text-destructive' : 'text-foreground-tertiary',
                            )}>
                              {format(new Date(t.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      ))}
                      {m.tasks.length > 5 && (
                        <p className="text-xs text-foreground-muted px-2">
                          +{m.tasks.length - 5} more
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
