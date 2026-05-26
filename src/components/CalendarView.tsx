'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type { CalendarTask } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  currentUserId?: string;
  onTaskClick: (taskId: string) => void;
  onCreateWithDate?: (date: string) => void;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-400',
  medium: 'bg-yellow-400',
  low:    'bg-blue-300',
};

export default function CalendarView({ workspaceId, projectId, currentUserId, onTaskClick, onCreateWithDate }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [version, setVersion] = useState(0);

  const fetchCalendar = () => setVersion((v) => v + 1);

  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    api
      .get<CalendarTask[]>(`/workspaces/${workspaceId}/projects/${projectId}/calendar`, {
        params: { month: monthStr },
      })
      .then((r) => setTasks(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, year, month, version]);

  const filtered = useMemo(() => {
    if (!myTasksOnly || !currentUserId) return tasks;
    return tasks.filter((t) => t.assignees.some((a) => a.id === currentUserId));
  }, [tasks, myTasksOnly, currentUserId]);

  // Build map: date-string → tasks
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    filtered.forEach((task) => {
      const dates = new Set<string>();
      if (task.due_date) dates.add(task.due_date);
      if (task.started_at) dates.add(task.started_at);
      dates.forEach((d) => {
        if (!map[d]) map[d] = [];
        map[d].push(task);
      });
    });
    return map;
  }, [filtered]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const totalDays = daysInMonth(year, month);
  const startDow = firstDayOfWeek(year, month);
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // Build grid cells: leading blanks + actual days
  const cells: { day: number | null }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d });
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
        <h2 className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
        <button
          type="button"
          onClick={goToday}
          className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 ml-1"
        >
          Today
        </button>
        <div className="ml-auto flex items-center gap-2">
          {currentUserId && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={myTasksOnly}
                onChange={(e) => setMyTasksOnly(e.target.checked)}
                className="rounded"
              />
              My tasks only
            </label>
          )}
          <button
            type="button"
            onClick={fetchCalendar}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="border rounded-xl overflow-hidden bg-white">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-400 text-sm">Loading…</p>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const dateStr = cell.day ? ymd(year, month, cell.day) : '';
              const dayTasks = dateStr ? (tasksByDate[dateStr] ?? []) : [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.day && onCreateWithDate) onCreateWithDate(dateStr);
                  }}
                  className={`min-h-[90px] p-1.5 border-r border-b last:border-r-0 relative
                    ${cell.day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}
                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                >
                  {cell.day && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-600 text-white' : 'text-gray-500'
                      }`}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}
                            className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate flex items-center gap-1 group"
                            style={{ backgroundColor: task.project_status?.color ? `${task.project_status.color}22` : '#F3F4F6' }}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`}
                            />
                            <span className="truncate text-gray-700 group-hover:text-gray-900">{task.title}</span>
                          </button>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="text-xs text-gray-400 pl-1">+{dayTasks.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
