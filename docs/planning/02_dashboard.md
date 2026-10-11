# Prompt 02 — Dashboard / Home

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
`00_setup.md` is complete. AppLayout (TopNav + Sidebar) is in place.
All page content goes inside AppLayout's `<main>` area.

## Route
`/dashboard` or `/` (after login redirect)

## Page layout
Single scrollable column. Container: `max-w-6xl mx-auto px-6 py-6 space-y-8`

---

## Section 1 — Page header

```tsx
<div className="flex items-start justify-between">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">
      {greeting}, {user.name.split(' ')[0]}  {/* Good morning / afternoon / evening */}
    </h1>
    <p className="text-sm text-foreground-tertiary mt-1">
      {format(new Date(), 'EEEE, MMMM d')}  {/* Monday, January 6 */}
    </p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1.5" />New task</Button>
    <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New project</Button>
  </div>
</div>
```

Greeting logic:
```ts
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
```

---

## Section 2 — Stats row

4 cards in a responsive grid: `grid grid-cols-2 lg:grid-cols-4 gap-4`

Each card — shadcn Card with `hover:shadow-md hover:border-border-strong transition-all duration-150`:

```tsx
<Card className="p-5">
  <div className="flex items-start justify-between">
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBg)}>
      <Icon className={cn("w-4 h-4", iconColor)} />
    </div>
    <Badge variant="secondary" className={trendColor}>{trend}</Badge>
  </div>
  <div className="mt-3">
    <p className="text-3xl font-semibold">{value}</p>
    <p className="text-sm text-foreground-secondary mt-0.5">{label}</p>
  </div>
</Card>
```

Cards data:
| # | Icon | Icon bg | Label | Trend badge |
|---|------|---------|-------|-------------|
| 1 | CheckSquare | bg-primary-subtle | Open tasks | "+3 this week" (success) |
| 2 | AlertCircle | bg-destructive-subtle | Overdue | "-2 vs last week" (success if down) |
| 3 | CheckCircle2 | bg-success-subtle | Completed this week | "+5 vs last week" (success) |
| 4 | FolderOpen | bg-primary-subtle | Active projects | neutral |

Number count-up animation on page load:
```ts
// Simple hook — counts from 0 to target over 600ms
function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const steps = 30
    const increment = target / steps
    const interval = duration / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, interval)
    return () => clearInterval(timer)
  }, [target])
  return count
}
```

---

## Section 3 — Two column layout

`grid grid-cols-1 lg:grid-cols-3 gap-6`
Left column: `lg:col-span-2` — My Tasks + Recent Activity
Right column: `lg:col-span-1` — My Projects + Upcoming deadlines

---

### LEFT — My tasks

Section header pattern (from DESIGN_SYSTEM.md):
- Label: "My tasks"
- Right: "View all" ghost link

Task list — each row (`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-all duration-150 group`):

```tsx
<div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-all duration-150 group">
  <Checkbox
    checked={task.completed}
    onCheckedChange={() => handleComplete(task.id)}
    className="flex-shrink-0"
  />
  <span className={cn(
    "flex-1 text-sm font-medium transition-all",
    task.completed && "line-through text-foreground-tertiary"
  )}>
    {task.title}
  </span>
  {/* Project badge */}
  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-foreground-secondary">
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.project.color }} />
    {task.project.name}
  </span>
  {/* Due date */}
  <span className={cn(
    "text-xs hidden group-hover:inline-flex items-center gap-1",
    isOverdue(task.due_date) ? "text-destructive" : "text-foreground-tertiary"
  )}>
    <Calendar className="w-3 h-3" />
    {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
  </span>
  {/* Priority icon */}
  <span className={getPriorityColor(task.priority)}>
    <PriorityIcon priority={task.priority} className="w-3.5 h-3.5" />
  </span>
</div>
```

Checkbox completion: task row gets `opacity-60` + strikethrough with `transition-all duration-300`.

Loading state: 5× Skeleton rows (`<Skeleton className="h-10 w-full rounded-lg" />`)

Empty state: (from DESIGN_SYSTEM.md pattern) — CheckSquare icon, "No tasks assigned to you", "Browse projects" Button.

---

### LEFT — Recent activity (below My tasks, `mt-6`)

Section header: "Recent activity"

Feed items — staggered `animate-slide-up` on load (50ms delay per item):

```tsx
<div
  className="flex gap-3 py-2.5 animate-slide-up"
  style={{ animationDelay: `${index * 50}ms` }}
>
  <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
    <AvatarImage src={item.actor.avatar} />
    <AvatarFallback className="text-[10px]">{initials(item.actor.name)}</AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <p className="text-sm">
      <span className="font-medium">{item.actor.name}</span>
      {' '}{item.action}{' '}
      <span className="font-medium text-foreground">{item.subject}</span>
    </p>
    <p className="text-xs text-foreground-tertiary mt-0.5">{formatRelativeTime(item.created_at)}</p>
  </div>
  <div className={cn("w-0.5 h-full rounded-full flex-shrink-0", activityAccentColor(item.type))} />
</div>
```

Activity accent colors: done=success, created=primary, commented=muted-foreground, assigned=warning.

Show 8 items. "View all activity →" text link at bottom.

---

### RIGHT — My projects

Section header: "Projects" + "New" Button size="sm"

Project list items (compact, not full cards):

```tsx
<div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-150"
  onClick={() => router.push(`/projects/${project.id}`)}>
  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
  <span className="flex-1 text-sm font-medium truncate">{project.name}</span>
  <span className="text-xs text-foreground-tertiary">{project.open_tasks_count} open</span>
</div>
// Progress bar below each item
<Progress value={project.completion_rate} className="h-[2px] mt-0.5 mx-3" />
```

---

### RIGHT — Upcoming deadlines (`mt-6`)

Section header: "Due soon"

Group by day with shadcn Separator between groups:

```tsx
// Day label
<p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider py-1">
  {dayLabel}  {/* "Today", "Tomorrow", "Wed Jan 8", etc. */}
</p>
// Task row
<div className="flex items-center gap-2 py-1.5">
  <span className={cn("text-xs font-medium w-16 flex-shrink-0", urgencyColor)}>{dayLabel}</span>
  <span className="text-sm flex-1 truncate">{task.title}</span>
  <Badge variant="secondary" className="text-[10px]">{task.project.name}</Badge>
</div>
```

Urgency colors: today=destructive, tomorrow=warning, rest=foreground-tertiary.

---

## Section 4 — All projects grid

Section header: "All projects" + sort Dropdown (Last updated / Name / Most tasks)

Grid: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`

Project card — shadcn Card:

```tsx
<Card className="group relative overflow-hidden hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 cursor-pointer"
  onClick={() => router.push(`/projects/${project.id}`)}>
  {/* Top color accent */}
  <div className="h-1 w-full" style={{ background: project.color }} />
  <div className="p-5">
    {/* Header */}
    <div className="flex items-start justify-between mb-2">
      <h3 className="text-base font-semibold leading-tight">{project.name}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Open</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {/* Description */}
    <p className="text-sm text-foreground-secondary line-clamp-2 mb-4 min-h-[2.5rem]">
      {project.description || 'No description'}
    </p>
    {/* Progress */}
    <Progress value={project.completion_rate} className="h-1.5 mb-2" />
    <div className="flex items-center justify-between text-xs text-foreground-tertiary mb-3">
      <span>{project.completion_rate}% complete</span>
      <span>{project.open_tasks_count} open tasks</span>
    </div>
    {/* Footer */}
    <div className="flex items-center justify-between">
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        {project.members.slice(0, 4).map(m => (
          <Avatar key={m.id} className="w-6 h-6 border-2 border-card">
            <AvatarImage src={m.avatar} />
            <AvatarFallback className="text-[9px]">{initials(m.name)}</AvatarFallback>
          </Avatar>
        ))}
        {project.members.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] text-foreground-secondary">
            +{project.members.length - 4}
          </div>
        )}
      </div>
      <span className="text-xs text-foreground-tertiary">
        Updated {formatRelativeTime(project.updated_at)}
      </span>
    </div>
  </div>
</Card>
```

Empty state (no projects): FolderOpen icon, "No projects yet", "Create your first project" Button.

---

## Loading / skeleton state

While data is fetching, show skeleton versions of all sections:
- Stats: 4× `<Skeleton className="h-28 rounded-xl" />`
- Tasks: 5× `<Skeleton className="h-10 rounded-lg" />`
- Projects grid: 6× `<Skeleton className="h-44 rounded-xl" />`

---

## Verification checklist

- [ ] Greeting changes based on time of day
- [ ] Stats count-up animation runs on load
- [ ] Task completion (checkbox) strikes through the task with transition
- [ ] Project cards navigate to correct project
- [ ] Card hover effects work (shadow, lift)
- [ ] Activity feed staggered animation works
- [ ] Loading skeletons show before data loads
- [ ] Empty states show when there are no tasks / no projects
- [ ] Light and dark mode both render correctly
- [ ] Mobile (375px): stats 2×2, columns stack vertically
