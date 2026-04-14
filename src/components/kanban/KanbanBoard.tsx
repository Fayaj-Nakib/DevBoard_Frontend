'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const COLUMNS = ['todo', 'in_progress', 'in_review', 'done'] as const;
type Column = (typeof COLUMNS)[number];

const LABELS: Record<Column, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  position: number;
  due_date?: string;
  assignee?: { name: string };
}

export interface ReorderItem {
  id: string;
  status: string;
  position: number;
}

interface Props {
  tasks: Record<string, Task[]>;
  onReorder: (items: ReorderItem[]) => Promise<void>;
  onTaskClick: (task: Task) => void;
}

export default function KanbanBoard({ tasks, onReorder, onTaskClick }: Props) {
  const [localTasks, setLocalTasks] = useState<Record<string, Task[]>>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    // Clone every column's array so we don't mutate state
    const newTasks: Record<string, Task[]> = {};
    COLUMNS.forEach((col) => {
      newTasks[col] = [...(localTasks[col] ?? [])];
    });

    const [movedTask] = newTasks[srcCol].splice(source.index, 1);
    newTasks[dstCol].splice(destination.index, 0, { ...movedTask, status: dstCol });

    // Optimistic UI update
    setLocalTasks(newTasks);

    const reorderItems: ReorderItem[] = COLUMNS.flatMap((col) =>
      newTasks[col].map((t, idx) => ({ id: t.id, status: col, position: idx + 1 }))
    );

    await onReorder(reorderItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-full">
        {COLUMNS.map((col) => (
          <div key={col} className="flex flex-col bg-gray-50 rounded-xl p-3 min-h-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">{LABELS[col]}</h3>
              <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5">
                {localTasks[col]?.length ?? 0}
              </span>
            </div>

            <Droppable droppableId={col}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col gap-2 flex-1 min-h-16 rounded-lg p-1 transition-colors ${
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
                          onClick={() => onTaskClick(task)}
                          className={`bg-white border rounded-lg p-3 text-sm shadow-sm cursor-pointer hover:shadow-md transition-all ${
                            snapshot.isDragging ? 'shadow-lg rotate-1 opacity-90' : ''
                          }`}
                        >
                          <p className="font-medium text-gray-800 mb-2 leading-snug">
                            {task.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                PRIORITY_STYLES[task.priority] ?? ''
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-gray-400">
                                {new Date(task.due_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                          {task.assignee && (
                            <p className="text-xs text-gray-400 mt-1.5">
                              {task.assignee.name}
                            </p>
                          )}
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
