'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Task } from '@/types';

export type { Task };

export interface ReorderItem {
  id: string;
  status: string;
  position: number;
}

const COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const;
type Column = (typeof COLUMNS)[number];

const COLUMN_LABELS: Record<Column, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const COLUMN_ACCENT: Record<Column, string> = {
  todo: 'border-t-gray-400',
  in_progress: 'border-t-blue-500',
  in_review: 'border-t-purple-500',
  done: 'border-t-green-500',
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
  onReorder: (items: ReorderItem[]) => Promise<void>;
  onTaskClick: (task: Task) => void;
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

function TaskCard({ task, onClick, isDragging }: { task: Task; onClick: () => void; isDragging: boolean }) {
  const subtasks = task.children ?? [];
  const doneSubs = subtasks.filter((s) => s.status === 'done').length;
  const hasSubs = subtasks.length > 0;

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-3 text-sm cursor-pointer select-none transition-all ${
        isDragging ? 'shadow-xl rotate-1 opacity-95 ring-2 ring-blue-300' : 'shadow-sm hover:shadow-md hover:border-blue-200'
      }`}
    >
      {/* Priority dot + title */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
        <p className="font-medium text-gray-800 leading-snug flex-1">{task.title}</p>
      </div>

      {/* Labels */}
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

      {/* Sub-task progress bar */}
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

      {/* Footer: priority badge + due date + assignees */}
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

      {/* Attachment indicator */}
      {task.attachments && task.attachments.length > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">📎 {task.attachments.length} attachment{task.attachments.length > 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, onReorder, onTaskClick }: Props) {
  const [localTasks, setLocalTasks] = useState<Record<string, Task[]>>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newTasks: Record<string, Task[]> = {};
    COLUMNS.forEach((col) => { newTasks[col] = [...(localTasks[col] ?? [])]; });

    const [movedTask] = newTasks[source.droppableId].splice(source.index, 1);
    newTasks[destination.droppableId].splice(destination.index, 0, {
      ...movedTask,
      status: destination.droppableId as Column,
    });

    setLocalTasks(newTasks);

    const reorderItems: ReorderItem[] = COLUMNS.flatMap((col) =>
      newTasks[col].map((t, idx) => ({ id: t.id, status: col, position: idx + 1 }))
    );
    await onReorder(reorderItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className={`flex flex-col bg-gray-50 rounded-xl border-t-2 ${COLUMN_ACCENT[col]} min-h-96`}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-gray-600">{COLUMN_LABELS[col]}</h3>
              <span className="text-xs bg-white border text-gray-500 rounded-full px-2 py-0.5 font-medium">
                {localTasks[col]?.length ?? 0}
              </span>
            </div>

            <Droppable droppableId={col}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col gap-2 flex-1 px-2 pb-2 min-h-16 rounded-b-xl transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {(localTasks[col] ?? []).map((task, index) => (
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
