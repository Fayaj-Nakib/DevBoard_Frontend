# Prompt 06 — Remaining Pages

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
All previous prompts (00–05) are complete. Match the existing visual style exactly.

Build these in order. Each is self-contained.

---

## 1. List view — `/projects/[id]/list`

Accessible via view switcher in the toolbar (reuse toolbar from board page).

### Table structure

```tsx
<div className="flex flex-col h-[calc(100vh-52px)]">
  <ProjectHeader />   {/* same as board */}
  <ViewToolbar />     {/* same as board, active tab = "list" */}

  <div className="flex-1 overflow-auto px-6 py-4">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead className="w-8">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
          </TableHead>
          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => sort('title')}>
            Title <SortIcon field="title" />
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignees</TableHead>
          <TableHead className="cursor-pointer" onClick={() => sort('due_date')}>
            Due date <SortIcon field="due_date" />
          </TableHead>
          <TableHead>Points</TableHead>
          <TableHead>Labels</TableHead>
          <TableHead>Sprint</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedTasks.map(group => (
          <>
            {/* Group header row */}
            <TableRow key={`group-${group.id}`} className="bg-background-secondary hover:bg-background-secondary">
              <TableCell colSpan={9} className="py-2 px-4">
                <button onClick={() => toggleGroup(group.id)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors">
                  <ChevronRight className={cn("w-4 h-4 transition-transform", expanded[group.id] && "rotate-90")} />
                  <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                  {group.name}
                  <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full">
                    {group.tasks.length}
                  </span>
                </button>
              </TableCell>
            </TableRow>

            {/* Task rows */}
            {expanded[group.id] && group.tasks.map(task => (
              <TableRow key={task.id}
                className={cn(
                  "hover:bg-accent/30 transition-colors cursor-pointer group",
                  selectedTasks.includes(task.id) && "bg-primary-subtle/20"
                )}
                onClick={() => openTask(task.id)}
              >
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleSelect(task.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-sm max-w-[300px] truncate">{task.title}</TableCell>
                <TableCell>
                  {/* Inline status selector */}
                  <button onClick={e => { e.stopPropagation(); openStatusPicker(task) }}
                    className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(task.status))}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {task.status_name}
                  </button>
                </TableCell>
                <TableCell>
                  <span className={cn("flex items-center gap-1 text-xs", getPriorityColor(task.priority))}>
                    <PriorityIcon priority={task.priority} className="w-3.5 h-3.5" />
                    {task.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0,3).map(a => (
                      <Avatar key={a.id} className="w-6 h-6 border border-background">
                        <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("text-xs", isOverdue(task.due_date) && "text-destructive")}>
                    {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-foreground-tertiary">{task.estimate ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {task.labels.slice(0,2).map(l => (
                      <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: l.color + '22', color: l.color }}>{l.name}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-foreground-tertiary">{task.sprint?.name ?? '—'}</TableCell>
              </TableRow>
            ))}

            {/* Inline add task per group */}
            <TableRow>
              <TableCell colSpan={9}>
                <button onClick={() => addTaskToGroup(group.id)}
                  className="flex items-center gap-2 text-xs text-foreground-tertiary hover:text-foreground transition-colors py-1 pl-8">
                  <Plus className="w-3.5 h-3.5" />Add task
                </button>
              </TableCell>
            </TableRow>
          </>
        ))}
      </TableBody>
    </Table>
  </div>
</div>
```

### Bulk action bar

Appears at bottom of screen when 1+ tasks selected:
```tsx
{selectedTasks.length > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
    <div className="flex items-center gap-2 bg-card border border-border-strong rounded-xl px-4 py-2.5 shadow-xl">
      <span className="text-sm font-medium mr-2">{selectedTasks.length} selected</span>
      <Separator orientation="vertical" className="h-5" />
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => bulkAction('move_status')}>
        <ArrowRight className="w-3.5 h-3.5 mr-1" />Move
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => bulkAction('assign')}>
        <UserPlus className="w-3.5 h-3.5 mr-1" />Assign
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => bulkAction('add_label')}>
        <Tag className="w-3.5 h-3.5 mr-1" />Label
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => bulkAction('delete')}>
        <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
      </Button>
      <Separator orientation="vertical" className="h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearSelection}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
)}
```

---

## 2. Notifications panel

A Sheet (side="right", w-80) triggered by the Bell icon in TopNav.

```tsx
<Sheet open={notifOpen} onOpenChange={setNotifOpen}>
  <SheetContent side="right" className="w-80 p-0 flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-base font-semibold">Notifications</h2>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
        Mark all read
      </Button>
    </div>

    {/* Tabs */}
    <Tabs defaultValue="all" className="flex flex-col flex-1 min-h-0">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9 px-4 justify-start gap-4">
        <TabsTrigger value="all" className="text-xs pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
          All
        </TabsTrigger>
        <TabsTrigger value="unread" className="text-xs pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </TabsTrigger>
        <TabsTrigger value="mentions" className="text-xs pb-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
          Mentions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="flex-1 overflow-y-auto m-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Bell className="w-8 h-8 text-foreground-muted mb-3" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-foreground-tertiary mt-1">No new notifications</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id}
            onClick={() => { markRead(n.id); navigate(n.link) }}
            className={cn(
              "flex gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-accent/30 group",
              !n.read && "bg-primary-subtle/10 border-l-2 border-primary"
            )}>
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="text-[10px]">{initials(n.actor.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed">
                <span className="font-medium">{n.actor.name}</span> {n.message}
              </p>
              <p className="text-[10px] text-foreground-tertiary mt-1">{formatRelativeTime(n.created_at)}</p>
            </div>
            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

TopNav Bell icon shows unread badge:
```tsx
<Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => setNotifOpen(true)}>
  <Bell className="w-4 h-4" />
  {unreadCount > 0 && (
    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</Button>
```

---

## 3. Global search — Command palette

Triggered by `Cmd+K` / `Ctrl+K` from anywhere. Uses shadcn Command.

Register the keyboard shortcut in a root layout `useEffect`:
```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

```tsx
<CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
  <CommandInput placeholder="Search tasks, projects, members..." />
  <CommandList>
    <CommandEmpty>
      <div className="flex flex-col items-center py-8 text-center">
        <Search className="w-8 h-8 text-foreground-muted mb-2" />
        <p className="text-sm text-foreground-secondary">No results found</p>
      </div>
    </CommandEmpty>

    {/* Recent searches — shown when input is empty */}
    {!query && recentSearches.length > 0 && (
      <CommandGroup heading="Recent">
        {recentSearches.map((s, i) => (
          <CommandItem key={i} onSelect={() => setQuery(s)}>
            <Clock className="w-4 h-4 mr-3 text-foreground-tertiary" />{s}
          </CommandItem>
        ))}
      </CommandGroup>
    )}

    {/* Tasks */}
    {results.tasks?.length > 0 && (
      <CommandGroup heading="Tasks">
        {results.tasks.map(t => (
          <CommandItem key={t.id} onSelect={() => { openTask(t.id); setSearchOpen(false) }}
            className="flex items-center gap-3">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusDot(t.status))} />
            <span className="flex-1 text-sm">{t.title}</span>
            <span className="text-xs text-foreground-tertiary bg-muted px-2 py-0.5 rounded">{t.project.name}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    )}

    {/* Projects */}
    {results.projects?.length > 0 && (
      <CommandGroup heading="Projects">
        {results.projects.map(p => (
          <CommandItem key={p.id} onSelect={() => { navigate(`/projects/${p.id}/board`); setSearchOpen(false) }}
            className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="text-sm">{p.name}</span>
            <span className="text-xs text-foreground-tertiary ml-auto">{p.members_count} members</span>
          </CommandItem>
        ))}
      </CommandGroup>
    )}

    {/* Members */}
    {results.members?.length > 0 && (
      <CommandGroup heading="Members">
        {results.members.map(m => (
          <CommandItem key={m.id} className="flex items-center gap-3">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px]">{initials(m.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{m.name}</span>
            <span className="text-xs text-foreground-tertiary ml-auto">{m.role}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    )}
  </CommandList>
</CommandDialog>
```

Debounced search: 300ms after last keystroke.
Save to recent: on item select, save query to localStorage (max 5).

---

## 4. Analytics page — `/projects/[id]/analytics`

```
max-w-5xl mx-auto px-6 py-6 space-y-6
```

Header:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-semibold">Analytics</h1>
    <p className="text-sm text-foreground-tertiary mt-0.5">{project.name}</p>
  </div>
  <Select value={range} onValueChange={setRange}>
    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="7">Last 7 days</SelectItem>
      <SelectItem value="30">Last 30 days</SelectItem>
      <SelectItem value="90">Last 90 days</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Stats row: same 4-card pattern as dashboard.

Charts grid `grid grid-cols-1 md:grid-cols-2 gap-5`:

Each chart card — shadcn Card with `p-5`:
```tsx
<Card>
  <CardHeader className="pb-3 pt-5 px-5">
    <CardTitle className="text-sm font-medium">{title}</CardTitle>
  </CardHeader>
  <CardContent className="px-5 pb-5">
    {/* Recharts component */}
  </CardContent>
</Card>
```

Charts to implement using Recharts:

**Task completion trend** — LineChart, tasks created (dashed, foreground-tertiary) vs completed (solid, primary), 30 days X-axis.

**Tasks by status** — PieChart/DonutChart. Each slice = status color from project_statuses. Custom legend below with colored dots + count.

**Tasks by assignee** — BarChart horizontal. Y-axis = member names, X-axis = task count. Bar fill = primary.

**Velocity by sprint** — BarChart vertical. X-axis = last 6 sprint names (truncated), Y-axis = story points. Two bars per sprint: planned (muted) + completed (success).

Recharts global config — apply in each chart:
```tsx
<ResponsiveContainer width="100%" height={220}>
  // chart
</ResponsiveContainer>
```

Custom tooltip style:
```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}
```

Loading: skeleton cards `<Skeleton className="h-[220px] w-full rounded-lg" />`

---

## 5. Sprint detail — `/projects/[id]/sprints/[sprintId]`

```
max-w-5xl mx-auto px-6 py-6
```

Header:
```tsx
<div className="flex items-start justify-between mb-6">
  <div>
    {/* Inline editable title */}
    <input value={sprint.name} onChange={...} onBlur={saveSprint}
      className="text-2xl font-semibold bg-transparent border-none outline-none focus:underline" />
    <div className="flex items-center gap-3 mt-2">
      <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'}>
        {sprint.status}
      </Badge>
      <span className="text-sm text-foreground-tertiary">
        {format(sprint.start_date, 'MMM d')} – {format(sprint.end_date, 'MMM d')}
      </span>
    </div>
    {/* Points progress */}
    <div className="flex items-center gap-3 mt-3">
      <Progress value={(sprint.completed_points / sprint.total_points) * 100} className="w-48 h-2" />
      <span className="text-sm text-foreground-secondary">
        {sprint.completed_points} / {sprint.total_points} pts
      </span>
    </div>
  </div>
  <div className="flex gap-2">
    {sprint.status === 'planning' && (
      <Button onClick={startSprint}>
        <Zap className="w-4 h-4 mr-1.5" />Start sprint
      </Button>
    )}
    {sprint.status === 'active' && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Complete sprint</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              {sprint.open_tasks_count} tasks are not done.
              Where should they go?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={moveTarget} onValueChange={setMoveTarget}>
            <SelectTrigger><SelectValue placeholder="Move to..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              {nextSprints.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={completeSprint}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </div>
</div>
```

Two column layout `grid grid-cols-3 gap-6`:

LEFT (col-span-2): Task list (reuse list view component, filtered to this sprint)

RIGHT (col-span-1):
- Burndown chart card (Recharts LineChart, two lines: actual=primary solid, ideal=foreground-tertiary dashed)
- Stats card: completed/open/velocity in small rows
- Member velocity table: avatar + name + points column

---

## 6. Workload view — `/projects/[id]/workload`

Header with sprint selector filter.

Grid `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`:

```tsx
{members.map(m => {
  const load = m.total_tasks
  const loadColor = load < 5 ? 'bg-success' : load < 10 ? 'bg-warning' : 'bg-destructive'
  return (
    <Card key={m.id} className="hover:border-border-strong transition-all">
      <CardContent className="p-4">
        {/* Member header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback>{initials(m.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{m.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn("w-2 h-2 rounded-full", loadColor)} />
              <span className="text-xs text-foreground-tertiary">
                {load} open · {m.overdue_count} overdue · {m.total_estimate} pts
              </span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div className={cn("h-full rounded-full transition-all", loadColor)}
            style={{ width: `${Math.min((load / 15) * 100, 100)}%` }} />
        </div>

        {/* Task list */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-foreground-tertiary hover:text-foreground transition-colors py-1">
            <span>Show tasks</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 mt-2">
            {m.tasks.slice(0, 5).map(t => (
              <div key={t.id} onClick={() => openTask(t.id)}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-accent/50 cursor-pointer transition-colors">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getStatusDot(t.status))} />
                <span className="flex-1 truncate">{t.title}</span>
                {t.due_date && (
                  <span className={cn(isOverdue(t.due_date) ? "text-destructive" : "text-foreground-tertiary")}>
                    {format(new Date(t.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
            {m.tasks.length > 5 && (
              <p className="text-xs text-foreground-tertiary px-2">+{m.tasks.length - 5} more</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
})}
```

---

## Shared requirements for all pages in this prompt

- All pages use AppLayout (TopNav + Sidebar)
- All pages work in both light and dark mode — test both before marking done
- All pages have Skeleton loading states while API data loads
- All pages have empty states (icon + message + action button) — never a blank page
- All list/table data is fetched from existing API endpoints
- Page mount animation: `animate-fade-in` wrapper on main content
- Error state if API fails: inline alert with Retry button — not a full page error:
  ```tsx
  <div className="flex items-center gap-3 p-4 bg-destructive-subtle border border-destructive/20 rounded-lg text-sm text-destructive">
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    Failed to load data.
    <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={retry}>Retry</Button>
  </div>
  ```

---

## Verification checklist

- [ ] List view renders with group headers, task rows, and inline add
- [ ] Bulk action bar appears when tasks are selected, disappears on deselect
- [ ] Notification sheet opens from TopNav bell icon with correct badge count
- [ ] Mark all read clears the unread state
- [ ] Cmd/Ctrl+K opens the command palette from any page
- [ ] Search debounces correctly, results grouped by type
- [ ] Analytics charts render in both light and dark mode
- [ ] Recharts custom tooltip styled correctly
- [ ] Sprint detail burndown chart shows both actual and ideal lines
- [ ] Complete sprint dialog shows open task count and move-to picker
- [ ] Workload cards show correct load colors (green/amber/red)
- [ ] Task list in workload cards is collapsible
- [ ] All pages have loading skeletons
- [ ] All pages have empty states
- [ ] Mobile responsive: all grids collapse appropriately
