'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { ProjectStatus, Task } from '@/types';

export type { Task };

export interface ReorderItem {
  id: string;
  status: string;
  project_status_id?: string;
  position: number;
}

const DEFAULT_COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const;
type DefaultColumn = (typeof DEFAULT_COLUMNS)[number];

const DEFAULT_LABELS: Record<DefaultColumn, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const DEFAULT_COLORS: Record<DefaultColumn, string> = {
  todo: '#64748B',
  in_progress: '#0052CC',
  in_review: '#7C3AED',
  done: '#16A34A',
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   '#EF4444',
  medium: '#F59E0B',
  low:    '#22C55E',
};

const PRIORITY_STRIPE_CLS: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-green-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
};

const PRIORITY_BG: Record<string, string> = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-green-50 text-green-600 border-green-200',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-green-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];

interface Props {
  tasks: Record<string, Task[]>;
  columns?: ProjectStatus[];
  onReorder: (items: ReorderItem[]) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onAddTask?: (statusId: string) => void;
  selectedIds?: Set<string>;
  onSelectTask?: (taskId: string) => void;
}

function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <span
      title={name}
      className={`w-6 h-6 rounded-full ${bg} text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0 ring-2 ring-white`}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

function PriorityIcon({ priority }: { priority: string }) {
  const color = PRIORITY_COLOR[priority] ?? '#9CA3AF';
  if (priority === 'high') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="High priority">
      <path d="M6 1L11 10H1L6 1Z" fill={color} />
    </svg>
  );
  if (priority === 'medium') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="Medium priority">
      <rect x="1" y="3" width="10" height="2.5" rx="1" fill={color} />
      <rect x="1" y="7" width="10" height="2.5" rx="1" fill={color} />
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="Low priority">
      <path d="M6 11L11 2H1L6 11Z" fill={color} />
    </svg>
  );
}

function TaskCard({
  task, onClick, isDragging, selected, onSelect,
}: {
  task: Task; onClick: () => void; isDragging: boolean;
  selected?: boolean; onSelect?: (id: string) => void;
}) {
  const subtasks = task.children ?? [];
  const doneSubs = subtasks.filter((s) => s.status === 'done').length;
  const hasSubs = subtasks.length > 0;
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-md text-sm cursor-pointer select-none transition-all border ${
        selected
          ? 'ring-2 ring-blue-500 border-blue-400 shadow-md'
          : isDragging
          ? 'shadow-2xl border-blue-300 ring-2 ring-blue-200 rotate-1'
          : 'border-[#DFE1E6] shadow-sm hover:shadow-md hover:border-[#B3BAC5]'
      }`}
    >
      {/* Left priority stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${PRIORITY_STRIPE_CLS[task.priority] ?? 'bg-gray-400'}`} />

      <div className="pl-3 pr-3 pt-3 pb-2.5">
        {/* Select checkbox (hover) */}
        {onSelect && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
            className={`absolute top-2 right-2 w-4 h-4 rounded border-2 flex items-center justify-center transition-all z-10
              ${selected
                ? 'bg-blue-600 border-blue-600 text-white opacity-100'
                : 'border-gray-300 bg-white opacity-0 group-hover:opacity-100'
              }`}
            aria-label={selected ? 'Deselect task' : 'Select task'}
          >
            {selected && <span className="text-[9px] leading-none font-bold">✓</span>}
          </button>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-[#DFE1E6] bg-white font-medium leading-tight text-[#172B4D]"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="flex-shrink-0">
                  <circle cx="4" cy="4" r="4" fill={l.color} />
                </svg>
                {l.name}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="text-[11px] text-[#626F86] bg-[#F4F5F7] px-1.5 py-0.5 rounded border border-[#DFE1E6]">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <p className="font-medium text-[#172B4D] leading-snug text-[13px] mb-2.5 pr-4">
          {task.title}
        </p>

        {/* Subtask progress */}
        {hasSubs && (
          <div className="mb-2.5">
            <div className="flex justify-between text-[11px] text-[#626F86] mb-1">
              <span>{doneSubs} / {subtasks.length} sub-tasks</span>
              <span className="font-medium">{Math.round((doneSubs / subtasks.length) * 100)}%</span>
            </div>
            <svg width="100%" height="4" className="rounded-full overflow-hidden" aria-hidden="true">
              <rect x="0" y="0" width="100%" height="4" fill="#DFE1E6" rx="2" />
              <rect x="0" y="0" width={`${Math.round((doneSubs / subtasks.length) * 100)}%`} height="4" fill="#22C55E" rx="2" />
            </svg>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <PriorityIcon priority={task.priority} />
            <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_BG[task.priority] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              {PRIORITY_LABEL[task.priority] ?? task.priority}
            </span>

            {task.estimate != null && (
              <span className="text-[11px] text-[#626F86] bg-[#F4F5F7] px-1.5 py-0.5 rounded border border-[#DFE1E6] font-medium">
                {task.estimate}pt
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-[#626F86]'}`}>
                {isOverdue ? '⚠ ' : ''}
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 3).map((a, i) => (
                  <Avatar key={a.id} name={a.name} index={i} />
                ))}
                {task.assignees.length > 3 && (
                  <span className="w-6 h-6 rounded-full bg-[#DFE1E6] text-[#626F86] text-[10px] flex items-center justify-center ring-2 ring-white font-medium">
                    +{task.assignees.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer icons */}
        {(task.recurrence_rule || (task.attachments && task.attachments.length > 0) || task.is_backlog) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F4F5F7]">
            {task.attachments && task.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#626F86]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {task.attachments.length}
              </span>
            )}
            {task.recurrence_rule && (
              <span className="text-[11px] text-[#626F86]" title={`Repeats ${task.recurrence_rule}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </span>
            )}
            {task.is_backlog && (
              <span className="text-[11px] text-amber-500 font-medium">Backlog</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, columns, onReorder, onTaskClick, onAddTask, selectedIds, onSelectTask }: Props) {
  const [localTasks, setLocalTasks] = useState<Record<string, Task[]>>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const colDefs: { id: string; label: string; color: string }[] = columns && columns.length > 0
    ? columns.map((s) => ({ id: s.id, label: s.name, color: s.color }))
    : DEFAULT_COLUMNS.map((c) => ({ id: c, label: DEFAULT_LABELS[c], color: DEFAULT_COLORS[c] }));

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newTasks: Record<string, Task[]> = {};
    colDefs.forEach(({ id }) => { newTasks[id] = [...(localTasks[id] ?? [])]; });

    const [movedTask] = newTasks[source.droppableId].splice(source.index, 1);
    const destStatus = columns
      ? (columns.find((s) => s.id === destination.droppableId)?.slug as Task['status'] ?? movedTask.status)
      : destination.droppableId as Task['status'];

    newTasks[destination.droppableId].splice(destination.index, 0, {
      ...movedTask,
      project_status_id: columns ? destination.droppableId : movedTask.project_status_id,
      status: destStatus,
    });

    setLocalTasks(newTasks);

    const reorderItems: ReorderItem[] = colDefs.flatMap(({ id }) =>
      (newTasks[id] ?? []).map((t, idx) => ({
        id: t.id,
        status: columns ? (columns.find((s) => s.id === id)?.slug ?? 'todo') : id,
        project_status_id: columns ? id : undefined,
        position: idx + 1,
      }))
    );

    await onReorder(reorderItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {colDefs.map((col) => {
          const taskCount = localTasks[col.id]?.length ?? 0;
          return (
            <div key={col.id} className="flex flex-col min-w-[272px] w-[272px] flex-shrink-0">
              {/* Colour accent strip — SVG fill avoids any CSS inline style */}
              <svg width="100%" height="3" aria-hidden="true" className="rounded-t-lg flex-shrink-0">
                <rect width="100%" height="3" fill={col.color} />
              </svg>
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#F4F5F7]">
                <div className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="flex-shrink-0">
                    <circle cx="5" cy="5" r="5" fill={col.color} />
                  </svg>
                  <h3 className="text-[12px] font-bold text-[#172B4D] uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold text-[#626F86] bg-white border border-[#DFE1E6] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {taskCount}
                  </span>
                </div>
                {onAddTask && (
                  <button
                    type="button"
                    onClick={() => onAddTask(col.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#626F86] hover:bg-[#DFE1E6] hover:text-[#172B4D] transition-colors"
                    title={`Add task to ${col.label}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Drop zone */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 flex-1 p-2 rounded-b-lg min-h-24 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                        : 'bg-[#F4F5F7]'
                    }`}
                  >
                    {(localTasks[col.id] ?? []).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              onClick={() => onTaskClick(task)}
                              isDragging={snapshot.isDragging}
                              selected={selectedIds?.has(task.id)}
                              onSelect={onSelectTask}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {(localTasks[col.id]?.length ?? 0) === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 border-2 border-dashed border-[#DFE1E6] rounded-md">
                        <p className="text-[12px] text-[#B3BAC5]">No tasks</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
