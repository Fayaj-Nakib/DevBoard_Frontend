'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import type { BurndownData } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  sprintId: string;
}

export default function BurndownChart({ workspaceId, projectId, sprintId }: Props) {
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<BurndownData>(
        `/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/burndown`
      )
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load burndown data.'))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, sprintId]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-xs text-gray-400">Loading burndown…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-xs text-red-400">{error ?? 'No data'}</p>
      </div>
    );
  }
  if (data.daily.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-xs text-gray-400">No burndown data yet — sprint hasn&apos;t started or has no estimates.</p>
      </div>
    );
  }

  const chartData = data.daily.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    remaining: d.remaining_points,
    ideal: d.ideal_points,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">
          Burndown — {data.sprint.name}
        </p>
        <p className="text-xs text-gray-400">
          {data.sprint.total_points} total pts
        </p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} />
          <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="remaining"
            name="Remaining"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="#9CA3AF"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
