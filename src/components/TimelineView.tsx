'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { TimelineGroup, TimelineTask } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  onTaskClick: (taskId: string) => void;
}

type Zoom = 'week' | 'month' | 'quarter';

const DAY_PX: Record<Zoom, number> = { week: 60, month: 20, quarter: 7 };
const ROW_H = 36;
const LABEL_W = 200;
const HEADER_H = 40;
const PADDING_DAYS = 3;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function parseDate(s: string | null): Date | null {
  return s ? new Date(s + 'T00:00:00') : null;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function TimelineView({ workspaceId, projectId, onTaskClick }: Props) {
  const [groups, setGroups] = useState<TimelineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<Zoom>('month');
  const [version, setVersion] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTimeline = () => setVersion((v) => v + 1);

  useEffect(() => {
    api
      .get<TimelineGroup[]>(`/workspaces/${workspaceId}/projects/${projectId}/timeline`)
      .then((r) => setGroups(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, version]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading timeline…</p>
      </div>
    );
  }

  const allTasks = groups.flatMap((g) => g.tasks);
  if (allTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
        <p className="text-2xl">📅</p>
        <p className="text-gray-500 text-sm font-medium">No tasks with dates yet</p>
        <p className="text-gray-400 text-xs">Add a start date or due date to tasks to see them here</p>
      </div>
    );
  }

  // Compute date range
  const dates = allTasks.flatMap((t) => [parseDate(t.started_at), parseDate(t.due_date)]).filter(Boolean) as Date[];
  const minDate = addDays(new Date(Math.min(...dates.map((d) => d.getTime()))), -PADDING_DAYS);
  const maxDate = addDays(new Date(Math.max(...dates.map((d) => d.getTime()))), PADDING_DAYS);
  const totalDays = diffDays(minDate, maxDate);
  const dpx = DAY_PX[zoom];
  const chartW = Math.max(totalDays * dpx, 600);

  // Build flat row list
  const rows: { task: TimelineTask; isGroupHeader: boolean; groupLabel?: string }[] = [];
  groups.forEach((g) => {
    rows.push({ task: g.tasks[0], isGroupHeader: true, groupLabel: g.milestone?.name ?? 'No milestone' });
    g.tasks.forEach((t) => rows.push({ task: t, isGroupHeader: false }));
  });

  const svgH = HEADER_H + rows.length * ROW_H + 20;

  // Build month tick labels
  const monthTicks: { x: number; label: string }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    const x = diffDays(minDate, cur) * dpx;
    if (x >= 0) monthTicks.push({ x, label: fmtMonth(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const todayX = diffDays(minDate, new Date()) * dpx;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 font-medium mr-1">Zoom:</span>
        {(['week', 'month', 'quarter'] as Zoom[]).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZoom(z)}
            className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors capitalize ${
              zoom === z ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {z}
          </button>
        ))}
        <button type="button" onClick={fetchTimeline} className="ml-auto text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
      </div>

      {/* Gantt */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="flex">
          {/* Left: task labels (sticky) */}
          <div className="flex-shrink-0 border-r bg-white z-10" style={{ width: LABEL_W }}>
            <div className="h-10 border-b flex items-center px-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Task</span>
            </div>
            {rows.map((row, i) => {
              if (row.isGroupHeader) {
                return (
                  <div
                    key={`gh-${i}`}
                    className="h-9 flex items-center px-3 bg-gray-50 border-b"
                  >
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                      {row.groupLabel}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={row.task.id}
                  className="h-9 flex items-center px-3 hover:bg-gray-50 border-b cursor-pointer"
                  onClick={() => onTaskClick(row.task.id)}
                >
                  <span className="text-xs text-gray-700 truncate">{row.task.title}</span>
                </div>
              );
            })}
          </div>

          {/* Right: chart area (scrollable) */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <svg width={chartW} height={svgH} className="block">
              {/* Month headers */}
              {monthTicks.map(({ x, label }) => (
                <g key={x}>
                  <line x1={x} y1={0} x2={x} y2={svgH} stroke="#E5E7EB" strokeWidth={1} />
                  <text x={x + 4} y={26} fontSize={10} fill="#9CA3AF" fontFamily="sans-serif">{label}</text>
                </g>
              ))}

              {/* Today marker */}
              {todayX >= 0 && todayX <= chartW && (
                <>
                  <line x1={todayX} y1={0} x2={todayX} y2={svgH} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 2" />
                  <text x={todayX + 3} y={14} fontSize={9} fill="#EF4444" fontFamily="sans-serif">Today</text>
                </>
              )}

              {/* Row backgrounds + bars */}
              {rows.map((row, i) => {
                const y = HEADER_H + i * ROW_H;

                if (row.isGroupHeader) {
                  return (
                    <rect key={`bg-${i}`} x={0} y={y} width={chartW} height={ROW_H} fill="#F9FAFB" />
                  );
                }

                const task = row.task;
                const start = parseDate(task.started_at);
                const end = parseDate(task.due_date);
                const color = task.project_status?.color ?? '#9CA3AF';

                // Alternate row bg
                if (i % 2 === 0) {
                  // light stripe — rendered via rect below
                }

                if (!start && !end) return null;

                if (!start && end) {
                  // Diamond milestone marker
                  const cx = diffDays(minDate, end) * dpx;
                  const cy = y + ROW_H / 2;
                  return (
                    <g key={task.id} className="cursor-pointer" onClick={() => onTaskClick(task.id)}>
                      <polygon
                        points={`${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`}
                        fill={color}
                        opacity={0.85}
                      />
                      <title>{task.title} — due {end ? fmtDate(end) : '?'}</title>
                    </g>
                  );
                }

                const barStart = start ?? end!;
                const barEnd = end ?? start!;
                const x1 = diffDays(minDate, barStart) * dpx;
                const x2 = Math.max(diffDays(minDate, barEnd) * dpx, x1 + 8);
                const barW = x2 - x1;

                return (
                  <g key={task.id} className="cursor-pointer" onClick={() => onTaskClick(task.id)}>
                    <rect
                      x={x1}
                      y={y + 8}
                      width={barW}
                      height={ROW_H - 16}
                      rx={4}
                      fill={color}
                      opacity={0.8}
                    />
                    {barW > 30 && (
                      <text
                        x={x1 + 5}
                        y={y + ROW_H / 2 + 4}
                        fontSize={9}
                        fill="white"
                        fontFamily="sans-serif"
                        style={{ pointerEvents: 'none' }}
                      >
                        {task.title.length > Math.floor(barW / 6) ? task.title.slice(0, Math.floor(barW / 6)) + '…' : task.title}
                      </text>
                    )}
                    <title>{task.title} · {start ? fmtDate(start) : '?'} → {end ? fmtDate(end) : '?'}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
