'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import api from '@/lib/api';
import type { ProjectStats, VelocityData } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
}

interface StatCard {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}

export default function AnalyticsDashboard({ workspaceId, projectId }: Props) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const fetchAll = () => { setLoading(true); setVersion((v) => v + 1); };

  useEffect(() => {
    Promise.all([
      api.get<ProjectStats>(`/workspaces/${workspaceId}/projects/${projectId}/stats`),
      api.get<VelocityData>(`/workspaces/${workspaceId}/projects/${projectId}/velocity`),
    ])
      .then(([s, v]) => {
        setStats(s.data);
        setVelocity(v.data);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, version]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading analytics…</p>
      </div>
    );
  }
  if (!stats) return null;

  const cards: StatCard[] = [
    { label: 'Open Tasks',       value: stats.open_tasks,        color: 'border-l-blue-500' },
    { label: 'Closed Tasks',     value: stats.closed_tasks,      color: 'border-l-green-500' },
    { label: 'Overdue',          value: stats.overdue_tasks,     color: 'border-l-red-500' },
    { label: 'Completion Rate',  value: `${stats.completion_rate}%`,
      sub: `${stats.tasks_completed_last_30_days} done last 30d`,
      color: 'border-l-purple-500' },
  ];

  const pieData = stats.tasks_by_status.map((s) => ({
    name:  s.status_name,
    value: Number(s.count),
    fill:  s.color,
  }));

  const assigneeData = stats.tasks_by_assignee.map((a) => ({
    name:  a.name,
    count: Number(a.count),
  }));

  const velocityData = velocity?.sprints.map((s) => ({
    name:      s.sprint_name,
    Planned:   s.planned_points,
    Completed: s.completed_points,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Project Analytics</h2>
        <button type="button" onClick={fetchAll} className="text-xs text-gray-400 hover:text-gray-600">
          ↻ Refresh
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white border rounded-xl p-4 border-l-4 ${c.color}`}>
            <p className="text-2xl font-bold text-gray-800">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by status — donut */}
        {pieData.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">Tasks by Status</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tasks by assignee — horizontal bar */}
        {assigneeData.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">Tasks by Assignee</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={assigneeData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="count" name="Tasks" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Velocity chart */}
      {velocityData.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-600">Sprint Velocity (last 5 sprints)</p>
            {velocity && (
              <p className="text-xs text-gray-400">
                Avg: <span className="font-semibold text-gray-600">{velocity.average_velocity} pts</span>
              </p>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Planned" fill="#E5E7EB" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Completed" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
