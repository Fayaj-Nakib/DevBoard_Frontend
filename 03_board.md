# Prompt 03 — Project Board (Kanban View)

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
`00_setup.md` is complete. AppLayout is in place. Use existing project/task API endpoints.

## Route
`/projects/[id]/board`

## Overall page structure

Three sticky layers + one scrollable canvas below:

```
┌─────────────────────────────────────────────┐
│ Project Header Bar      (h-14, sticky)       │
├─────────────────────────────────────────────┤
│ View Toolbar            (h-11, sticky)       │
├─────────────────────────────────────────────┤
│                                             │
│ Board Canvas            (flex-1, overflow)  │
│ ← horizontal scroll →                       │
│                                             │
└─────────────────────────────────────────────┘
```

Full page wrapper: `flex flex-col h-[calc(100vh-52px)]`
(52px = TopNav height)

---

## Layer 1 — Project header bar

```
h-14 bg-background border-b border-border px-6 flex items-center justify-between sticky top-[52px] z-30
```

LEFT:
```tsx
<div className="flex items-center gap-3">
  {/* Breadcrumb */}
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink href="/dashboard" className="text-foreground-tertiary text-sm">
          {workspace.name}
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage className="text-sm font-medium">{project.name}</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
  {/* Color dot */}
  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
</div>
```

RIGHT:
```tsx
<div className="flex items-center gap-2">
  {/* Stacked member avatars */}
  <div className="flex -space-x-2 mr-2">
    {project.members.slice(0, 4).map(m => (
      <Avatar key={m.id} className="w-7 h-7 border-2 border-background">
        <AvatarImage src={m.avatar} />
        <AvatarFallback className="text-[10px]">{initials(m.name)}</AvatarFallback>
      </Avatar>
    ))}
  </div>
  <Button variant="outline" size="sm">
    <UserPlus className="w-3.5 h-3.5 mr-1.5" />Invite
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem><Settings className="w-4 h-4 mr-2" />Settings</DropdownMenuItem>
      <DropdownMenuItem><Link2 className="w-4 h-4 mr-2" />Copy link</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete project</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

---

## Layer 2 — View toolbar

```
h-11 bg-background border-b border-border px-6 flex items-center gap-3 sticky top-[110px] z-20
```

LEFT — view switcher tabs:
```tsx
// Custom tab group — not shadcn Tabs panels, just styled buttons
<div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
  {[
    { id: 'board',    icon: LayoutGrid,   label: 'Board'    },
    { id: 'list',     icon: List,         label: 'List'     },
    { id: 'timeline', icon: GanttChart,   label: 'Timeline' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    { id: 'backlog',  icon: Layers,       label: 'Backlog'  },
  ].map(v => (
    <button
      key={v.id}
      onClick={() => setView(v.id)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded text-sm transition-all duration-150",
        view === v.id
          ? "bg-background shadow-sm text-foreground font-medium"
          : "text-foreground-tertiary hover:text-foreground"
      )}
    >
      <v.icon className="w-3.5 h-3.5" />
      {v.label}
    </button>
  ))}
</div>
```

CENTER — filters:
```tsx
{/* Filter trigger */}
<Button
  variant="outline"
  size="sm"
  className={cn("h-7 text-xs", activeFilterCount > 0 && "border-primary text-primary")}
  onClick={() => setFilterOpen(true)}
>
  <Filter className="w-3 h-3 mr-1.5" />
  {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filter'}
</Button>

{/* Active filter chips */}
{activeFilters.map(f => (
  <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-subtle text-primary-subtle-foreground rounded-full text-xs font-medium animate-slide-up">
    {f.label}
    <button onClick={() => removeFilter(f.id)} className="hover:text-primary ml-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
))}

{/* Group by */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground-tertiary">
      <Group className="w-3 h-3 mr-1.5" />Group: {groupBy}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {['Status','Assignee','Priority','Milestone','Sprint'].map(g => (
      <DropdownMenuItem key={g} onClick={() => setGroupBy(g)}>
        {groupBy === g && <Check className="w-3.5 h-3.5 mr-2" />}
        {g}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

RIGHT:
```tsx
{/* Sprint selector */}
<Select value={selectedSprint} onValueChange={setSelectedSprint}>
  <SelectTrigger className="h-7 text-xs w-36">
    <SelectValue placeholder="All sprints" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All sprints</SelectItem>
    {sprints.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
  </SelectContent>
</Select>

{/* Search */}
<div className="relative">
  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-tertiary" />
  <input
    placeholder="Search tasks..."
    className={cn(
      "h-7 pl-7 pr-3 text-xs bg-muted rounded-md border border-transparent",
      "focus:outline-none focus:border-border-strong focus:bg-background",
      "transition-all duration-150 w-32 focus:w-56"
    )}
  />
</div>
```

Filter panel — shadcn Sheet side="left", w-72:
- Assignee: list of workspace members with checkboxes + avatars
- Label: list of project labels with color dots + checkboxes
- Priority: checkbox group (Urgent / High / Medium / Low)
- Due date: date range picker (From / To)
- Milestone: select
- "Clear all" ghost button at bottom

---

## Layer 3 — Board canvas

```
flex-1 overflow-x-auto overflow-y-hidden
```

Inner: `flex items-start gap-3 px-6 py-4 min-h-full`

Install @dnd-kit (already done in 00_setup). Import:
```ts
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```

### Column component

`min-w-[272px] max-w-[272px] flex flex-col rounded-xl bg-background-secondary border border-border`

COLUMN HEADER — `px-3 py-2.5 flex items-center gap-2`:
```tsx
<div className="flex items-center gap-2 flex-1">
  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.color }} />
  <span className="text-sm font-medium">{status.name}</span>
  <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full">
    {tasks.length}
  </span>
</div>
<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <Button
    variant="ghost" size="icon"
    className="h-6 w-6"
    onClick={() => setInlineAdd(true)}
  >
    <Plus className="w-3.5 h-3.5" />
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-6 w-6">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Edit status</DropdownMenuItem>
      <DropdownMenuItem>Set WIP limit</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive">Delete status</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

COLUMN BODY — `flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 max-h-[calc(100vh-200px)]`:

Drop zone active state:
```tsx
className={cn(
  "flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 max-h-[calc(100vh-200px)] rounded-lg transition-all duration-150",
  isOver && "bg-primary-subtle/20 ring-2 ring-dashed ring-primary/30"
)}
```

### Task card component

Use `useSortable` from @dnd-kit:

```tsx
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-lg p-3 border border-border cursor-pointer",
        "hover:shadow-md hover:border-border-strong hover:-translate-y-[1px]",
        "transition-all duration-150 animate-fade-in",
        isDragging && "opacity-50 rotate-1 shadow-xl scale-105"
      )}
    >
      {/* Drag handle — visible on hover */}
      <div
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-foreground-muted" />
      </div>

      {/* Top row: priority icon + assignee */}
      <div className="flex items-start justify-between mb-2">
        <PriorityIcon priority={task.priority} className={cn("w-3.5 h-3.5 flex-shrink-0", getPriorityColor(task.priority))} />
        {task.assignees?.[0] && (
          <Avatar className="w-5 h-5">
            <AvatarImage src={task.assignees[0].avatar} />
            <AvatarFallback className="text-[9px]">{initials(task.assignees[0].name)}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2 mb-2">
        {task.title}
      </p>

      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 2).map(l => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: l.color + '22', color: l.color }}
            >
              {l.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-foreground-tertiary px-1">+{task.labels.length - 2}</span>
          )}
        </div>
      )}

      {/* Bottom row: metadata icons */}
      <div className="flex items-center gap-3 text-foreground-tertiary">
        {task.due_date && (
          <span className={cn("flex items-center gap-1 text-[11px]", isOverdue(task.due_date) && "text-destructive")}>
            <Calendar className="w-3 h-3" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        {task.subtasks_count > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <GitBranch className="w-3 h-3" />
            {task.completed_subtasks_count}/{task.subtasks_count}
          </span>
        )}
        {task.attachments_count > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <Paperclip className="w-3 h-3" />
            {task.attachments_count}
          </span>
        )}
        {task.comments_count > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <MessageSquare className="w-3 h-3" />
            {task.comments_count}
          </span>
        )}
      </div>
    </div>
  )
}
```

Right-click ContextMenu on each card:
```tsx
<ContextMenu>
  <ContextMenuTrigger>{/* card content */}</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={openTaskDetail}>Open</ContextMenuItem>
    <ContextMenuItem>Copy link</ContextMenuItem>
    <ContextMenuSub>
      <ContextMenuSubTrigger>Move to...</ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {statuses.map(s => (
          <ContextMenuItem key={s.id} onClick={() => moveTask(task.id, s.id)}>{s.name}</ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
    <ContextMenuItem>Assign to me</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### Inline add task

Below all cards in column, always visible:
```tsx
{inlineAdd ? (
  <div className="p-2 animate-slide-up">
    <input
      autoFocus
      placeholder="Task title..."
      className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      onKeyDown={e => {
        if (e.key === 'Enter') createTask(e.currentTarget.value, status.id)
        if (e.key === 'Escape') setInlineAdd(false)
      }}
      onBlur={() => setInlineAdd(false)}
    />
    <p className="text-[10px] text-foreground-tertiary mt-1 px-1">Enter to save · Esc to cancel</p>
  </div>
) : (
  <button
    onClick={() => setInlineAdd(true)}
    className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-foreground-tertiary rounded-lg hover:bg-accent/50 hover:text-foreground transition-all duration-150"
  >
    <Plus className="w-3.5 h-3.5" />Add task
  </button>
)}
```

New task on create: appears at top of column with `animate-slide-up`.

### Add column button

After all columns:
```tsx
<div
  onClick={() => setAddingStatus(true)}
  className="min-w-[272px] max-w-[272px] h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-foreground-tertiary cursor-pointer hover:bg-accent/30 hover:border-border-strong hover:text-foreground transition-all duration-150"
>
  <Plus className="w-4 h-4" />Add status
</div>
```

Adding status form (replaces the button):
```tsx
<div className="min-w-[272px] max-w-[272px] bg-background-secondary rounded-xl border border-border p-3 animate-slide-up">
  <input autoFocus placeholder="Status name..." className="..." />
  {/* 8 color swatches */}
  <div className="flex gap-1.5 mt-2">
    {STATUS_COLORS.map(c => (
      <button key={c} onClick={() => setColor(c)}
        className={cn("w-5 h-5 rounded-full transition-transform", selectedColor === c && "scale-125 ring-2 ring-offset-1 ring-primary")}
        style={{ background: c }}
      />
    ))}
  </div>
  <div className="flex gap-2 mt-3">
    <Button size="sm" className="flex-1" onClick={createStatus}>Add</Button>
    <Button size="sm" variant="ghost" onClick={() => setAddingStatus(false)}>Cancel</Button>
  </div>
</div>
```

### DnD wiring

Wrap the entire board canvas in `<DndContext>`:
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  {/* columns */}
  <DragOverlay>
    {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
  </DragOverlay>
</DndContext>
```

`onDragEnd`: call PATCH /tasks/{id} with new status_id and position. Optimistically update local state first, revert on API error.

---

## Loading state

Show skeleton columns while loading:
```tsx
{[1,2,3].map(i => (
  <div key={i} className="min-w-[272px] bg-background-secondary rounded-xl border border-border p-3 space-y-2">
    <Skeleton className="h-5 w-24" />
    {[1,2,3].map(j => <Skeleton key={j} className="h-24 w-full rounded-lg" />)}
  </div>
))}
```

---

## Verification checklist

- [ ] Columns render with correct status names and colors
- [ ] Task cards show all metadata (labels, dates, assignees, subtask count)
- [ ] Drag and drop moves tasks between columns and calls the API
- [ ] Drag overlay renders the card being dragged
- [ ] Drop zone highlights when dragging over
- [ ] Inline add task works (Enter saves, Esc cancels)
- [ ] Right-click context menu appears on task cards
- [ ] Filters open in Sheet, filter chips appear in toolbar
- [ ] View switcher navigates between views
- [ ] Add column form creates a new status
- [ ] Light and dark mode both render correctly
- [ ] Horizontal scroll works when columns overflow viewport
