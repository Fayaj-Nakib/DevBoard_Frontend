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
  todo: '#9CA3AF',
  in_progress: '#3B82F6',
  in_review: '#8B5CF6',
  done: '#10B981',
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
};

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-yellow-400',
  low:    'bg-green-500',
};

interface Props {
  tasks: Record<string, Task[]>;
  columns?: ProjectStatus[];
  onReorder: (items: ReorderItem[]) => Promise<void>;
  onTaskClick: (task: Task) => void;
  selectedIds?: Set<string>;
  onSelectTask?: (taskId: string) => void;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-semibold flex-shrink-0 ring-1 ring-white"
    >
      {name[0].toUpperCase()}
    </span>
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
      className={`group bg-white border rounded-xl p-3 text-sm cursor-pointer select-none transition-all ${
        selected
          ? 'ring-2 ring-blue-400 border-blue-300'
          : isDragging
          ? 'shadow-xl rotate-1 opacity-95 ring-2 ring-blue-300'
          : 'shadow-sm hover:shadow-md hover:border-blue-200'
      }`}
    >
      {onSelect && (
        <div className="flex items-start gap-2 mb-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5
              ${selected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 opacity-0 group-hover:opacity-100'
              }`}
            aria-label={selected ? 'Deselect task' : 'Select task'}
          >
            {selected && <span className="text-[10px] leading-none">✓</span>}
          </button>
        </div>
      )}

      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
        <p className="font-medium text-gray-800 leading-snug flex-1">{task.title}</p>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((l) => (
            <span
              key={l.id}
              style={{ backgroundColor: l.color + '22', color: l.color }}
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            >
              {l.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-gray-400">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {hasSubs && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>{doneSubs}/{subtasks.length} sub-tasks</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${(doneSubs / subtasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[task.priority] ?? ''}`}>
          {task.priority}
        </span>

        <div className="flex items-center gap-2">
          {task.estimate != null && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{task.estimate}pt</span>
          )}

          {task.due_date && (
            <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}

          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} name={a.name} />
              ))}
              {task.assignees.length > 3 && (
                <span className="text-xs text-gray-400 ml-1">+{task.assignees.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {(task.recurrence_rule || (task.attachments && task.attachments.length > 0) || task.is_backlog) && (
        <div className="flex items-center gap-2 mt-1.5">
          {task.recurrence_rule && (
            <span className="text-xs text-gray-400" title={`Repeats ${task.recurrence_rule}`}>🔁</span>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <span className="text-xs text-gray-400">📎 {task.attachments.length}</span>
          )}
          {task.is_backlog && (
            <span className="text-xs text-orange-400" title="In backlog">📋</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, columns, onReorder, onTaskClick, selectedIds, onSelectTask }: Props) {
  const [localTasks, setLocalTasks] = useState<Record<string, Task[]>>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Build column definitions — dynamic if provided, otherwise hardcoded defaults
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
        status: columns
          ? (columns.find((s) => s.id === id)?.slug ?? 'todo')
          : id,
        project_status_id: columns ? id : undefined,
        position: idx + 1,
      }))
    );

    await onReorder(reorderItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {colDefs.map((col) => (
          <div
            key={col.id}
            /* eslint-disable-next-line react/forbid-dom-props */
            style={{ '--col-accent': col.color } as React.CSSProperties}
            className="flex flex-col bg-gray-50 rounded-xl min-w-64 w-64 flex-shrink-0 border-t-2 [border-top-color:var(--col-accent)]"
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-gray-600">{col.label}</h3>
              <span className="text-xs bg-white border text-gray-500 rounded-full px-2 py-0.5 font-medium">
                {localTasks[col.id]?.length ?? 0}
              </span>
            </div>

            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col gap-2 flex-1 px-2 pb-2 min-h-16 rounded-b-xl transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
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
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
