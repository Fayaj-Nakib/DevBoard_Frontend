'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie,
} from 'recharts';
import { AlertCircle } from 'lucide-react';

import api from '@/lib/api';
import type { ProjectStats } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="flex items-center gap-1.5">
          <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
            <circle cx="3" cy="3" r="3" fill={p.color} />
          </svg>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function WorkspaceAnalyticsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState('30');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get<ProjectStats>(`/workspaces/${workspaceId}/stats`, { params: { days: range } })
      .then((r) => { setStats(r.data); setError(false); })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setStats(null);
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, range, refreshKey]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => <Skeleton key={i} className="h-[220px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 p-4 bg-destructive-subtle border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load analytics.
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

  if (!stats) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-foreground-tertiary mt-4">No analytics data available yet.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Open tasks',      value: stats.open_tasks,      color: 'text-primary' },
    { label: 'Closed tasks',    value: stats.closed_tasks,    color: 'text-success' },
    { label: 'Overdue',         value: stats.overdue_tasks,   color: 'text-destructive' },
    { label: 'Completion rate', value: `${stats.completion_rate}%`, color: 'text-foreground',
      sub: `${stats.tasks_completed_last_30_days} done last ${range}d` },
  ];

  const pieData = stats.tasks_by_status.map((s) => ({
    name: s.status_name, value: Number(s.count), fill: s.color,
  }));

  const assigneeData = stats.tasks_by_assignee.map((a) => ({
    name: a.name, count: Number(a.count),
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-foreground-tertiary mt-0.5">Workspace overview</p>
        </div>
        <Select value={range} onValueChange={(v) => { if (v) setRange(v); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">{c.label}</p>
              {'sub' in c && c.sub && <p className="text-xs text-foreground-muted mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-medium">Tasks by status</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} paddingAngle={2} />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {assigneeData.length > 0 && (
          <Card>
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-medium">Tasks by assignee</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={assigneeData} layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false}
                    stroke="rgba(128,128,128,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                  <YAxis type="category" dataKey="name" width={80}
                    tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Tasks" fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
