'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Sprint, WorkloadMember } from '@/types';

interface Props {
  workspaceId: string;
  projectId: string;
  onTaskClick: (taskId: string) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   'text-red-500',
  medium: 'text-yellow-500',
  low:    'text-blue-400',
};

function loadColor(total: number): string {
  if (total >= 10) return 'bg-red-500';
  if (total >= 5)  return 'bg-amber-400';
  return 'bg-green-400';
}
function loadLabel(total: number): string {
  if (total >= 10) return 'Overloaded';
  if (total >= 5)  return 'Busy';
  return 'Healthy';
}
function loadTextColor(total: number): string {
  if (total >= 10) return 'text-red-600';
  if (total >= 5)  return 'text-amber-600';
  return 'text-green-600';
}

export default function WorkloadView({ workspaceId, projectId, onTaskClick }: Props) {
  const [members, setMembers] = useState<WorkloadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  const fetchWorkload = () => setVersion((v) => v + 1);

  useEffect(() => {
    api
      .get<Sprint[]>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(r.data));
  }, [workspaceId, projectId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (sprintId) params.sprint_id = sprintId;
    api
      .get<WorkloadMember[]>(`/workspaces/${workspaceId}/projects/${projectId}/workload`, { params })
      .then((r) => setMembers(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, sprintId, version]);

  const toggleExpand = (userId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading workload…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-xs text-gray-500 font-medium" htmlFor="wl-sprint">Sprint:</label>
        <select
          id="wl-sprint"
          value={sprintId}
          onChange={(e) => setSprintId(e.target.value)}
          className="text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All sprints</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button type="button" onClick={fetchWorkload} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
          ↻ Refresh
        </button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <p className="text-gray-500 text-sm font-medium">No assigned tasks</p>
          <p className="text-gray-400 text-xs">Assign tasks to team members to see workload</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => {
            const expanded = expandedIds.has(member.user.id);
            const color = loadColor(member.total_tasks);
            const label = loadLabel(member.total_tasks);
            const textColor = loadTextColor(member.total_tasks);

            return (
              <div key={member.user.id} className="bg-white border rounded-xl overflow-hidden">
                {/* Card header */}
                <div className={`h-1.5 ${color}`} />
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{member.user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                    </div>
                    <span className={`text-xs font-medium ${textColor} flex-shrink-0`}>{label}</span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span>
                      <span className="font-semibold text-gray-700">{member.total_tasks}</span> tasks
                    </span>
                    {member.overdue_count > 0 && (
                      <span className="text-red-500 font-medium">
                        {member.overdue_count} overdue
                      </span>
                    )}
                    {member.total_estimate > 0 && (
                      <span>{member.total_estimate} pts</span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(member.user.id)}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    {expanded ? 'Hide tasks ▲' : 'Show tasks ▼'}
                  </button>
                </div>

                {/* Task list */}
                {expanded && (
                  <div className="border-t divide-y max-h-60 overflow-y-auto">
                    {member.tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onTaskClick(task.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs mt-0.5 ${PRIORITY_COLOR[task.priority] ?? 'text-gray-400'}`}>●</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${task.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className={`text-xs mt-0.5 ${task.is_overdue ? 'text-red-400' : 'text-gray-400'}`}>
                                Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                          {task.estimate != null && (
                            <span className="text-xs text-gray-400 flex-shrink-0">{task.estimate}pt</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
