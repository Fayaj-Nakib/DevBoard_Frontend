# Prompt 04 — Task Detail Sheet

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
`00_setup.md` is complete. AppLayout is in place. Board page exists.

## Pattern
Task detail opens as a **shadcn Sheet from the right** — not a Dialog.
The board/list behind it remains partially visible.
Width: `w-[640px]` desktop, full-width mobile.
Triggered by clicking any task card.

```tsx
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent side="right" className="w-full sm:w-[640px] p-0 flex flex-col gap-0 overflow-hidden">
    {/* all content here */}
  </SheetContent>
</Sheet>
```

---

## Sheet header (sticky)

```
h-12 px-5 border-b border-border bg-background flex items-center justify-between flex-shrink-0
```

LEFT:
```tsx
<div className="flex items-center gap-2">
  {/* Breadcrumb */}
  <span className="text-xs text-foreground-tertiary">{project.name}</span>
  {milestone && <>
    <ChevronRight className="w-3 h-3 text-foreground-muted" />
    <span className="text-xs text-foreground-tertiary">{milestone.name}</span>
  </>}
  {/* Task ID */}
  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground-secondary">
    {project.identifier}-{task.id}
  </span>
</div>
```

RIGHT:
```tsx
<div className="flex items-center gap-1">
  <Button variant="ghost" size="icon" className="h-7 w-7" title="Open full page">
    <ArrowUpRight className="w-3.5 h-3.5" />
  </Button>
  <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy link"
    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied') }}>
    <Link2 className="w-3.5 h-3.5" />
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem><Copy className="w-4 h-4 mr-2" />Duplicate</DropdownMenuItem>
      <DropdownMenuItem><FolderInput className="w-4 h-4 mr-2" />Move to project</DropdownMenuItem>
      <DropdownMenuItem><GitBranch className="w-4 h-4 mr-2" />Convert to subtask</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
    <X className="w-3.5 h-3.5" />
  </Button>
</div>
```

---

## Scrollable body

`flex-1 overflow-y-auto` — everything below the header scrolls.

---

## Section 1 — Title

`px-6 pt-5 pb-3`

```tsx
<textarea
  ref={titleRef}
  value={title}
  onChange={e => setTitle(e.target.value)}
  onBlur={() => updateTask({ title })}
  placeholder="Task title"
  rows={1}
  className={cn(
    "w-full resize-none text-xl font-semibold leading-snug bg-transparent",
    "border-none outline-none placeholder:text-foreground-muted",
    "focus:ring-0 transition-all duration-150"
  )}
  style={{ height: 'auto' }}
  onInput={e => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }}
/>
```

---

## Section 2 — Status/priority quick row

`px-6 py-2 flex flex-wrap items-center gap-2`

Each is a compact button-styled selector:

**Status selector:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      "hover:opacity-80 transition-opacity",
      getStatusColor(task.status)
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {task.status_name}
      <ChevronDown className="w-3 h-3 ml-0.5" />
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-48 p-1">
    {statuses.map(s => (
      <button key={s.id} onClick={() => updateStatus(s.id)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors">
        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
        {s.name}
        {task.status_id === s.id && <Check className="w-3.5 h-3.5 ml-auto" />}
      </button>
    ))}
  </PopoverContent>
</Popover>
```

**Priority selector:** same pattern, shows priority icon + name.

**Assignees:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-accent transition-colors">
      {task.assignees.length === 0 ? (
        <><UserPlus className="w-3.5 h-3.5" />Assign</>
      ) : (
        <div className="flex -space-x-1">
          {task.assignees.slice(0,3).map(a => (
            <Avatar key={a.id} className="w-5 h-5 border border-background">
              <AvatarImage src={a.avatar} />
              <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-64 p-2">
    <input placeholder="Search members..." className="w-full text-sm bg-muted rounded px-3 py-1.5 mb-2 focus:outline-none" />
    {members.map(m => (
      <button key={m.id} onClick={() => toggleAssignee(m.id)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm">
        <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{initials(m.name)}</AvatarFallback></Avatar>
        {m.name}
        {task.assignees.find(a => a.id === m.id) && <Check className="w-3.5 h-3.5 ml-auto" />}
      </button>
    ))}
  </PopoverContent>
</Popover>
```

**Due date:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-accent transition-colors",
      isOverdue(task.due_date) && "bg-destructive-subtle text-destructive"
    )}>
      <Calendar className="w-3.5 h-3.5" />
      {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'Due date'}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar mode="single" selected={task.due_date ? new Date(task.due_date) : undefined}
      onSelect={d => updateTask({ due_date: d?.toISOString() })} />
  </PopoverContent>
</Popover>
```

---

## Section 3 — Metadata grid

`px-6 py-3 border-t border-border`

`grid grid-cols-2 gap-x-6 gap-y-3`

Each field:
```tsx
<div>
  <p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary mb-1">
    {fieldLabel}
  </p>
  <button className="text-sm text-foreground hover:bg-accent/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-w-[80px] text-left">
    {value || <span className="text-foreground-tertiary">None</span>}
  </button>
</div>
```

Fields (row by row):
- Row 1: Sprint | Milestone
- Row 2: Start date | Due date  
- Row 3: Story points | Time logged
- Row 4: Reporter | Created at
- Full row: Labels (multi-select badges)
- Full row: Watchers (avatar list + add button)

---

## Section 4 — Description

`px-6 py-4 border-t border-border`

```tsx
<p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary mb-2">Description</p>

{/* Format toolbar — visible on focus */}
{descFocused && (
  <div className="flex items-center gap-0.5 mb-2 animate-fade-in">
    {[
      { icon: Bold, action: 'bold' },
      { icon: Italic, action: 'italic' },
      { icon: Code, action: 'code' },
      { icon: Link2, action: 'link' },
      { icon: List, action: 'list' },
    ].map(({ icon: Icon, action }) => (
      <Button key={action} variant="ghost" size="icon" className="h-7 w-7">
        <Icon className="w-3.5 h-3.5" />
      </Button>
    ))}
  </div>
)}

<textarea
  value={description}
  onChange={e => setDescription(e.target.value)}
  onFocus={() => setDescFocused(true)}
  onBlur={() => { setDescFocused(false); updateTask({ description }) }}
  placeholder="Add a description..."
  className={cn(
    "w-full resize-none text-sm bg-transparent border-none outline-none",
    "placeholder:text-foreground-muted leading-relaxed min-h-[80px]",
    "focus:ring-0"
  )}
/>
```

---

## Section 5 — Sub-tasks

`px-6 py-4 border-t border-border`

```tsx
<div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">Sub-tasks</p>
    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-foreground-secondary">
      {completedSubtasks}/{totalSubtasks}
    </span>
  </div>
  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAddingSubtask(true)}>
    <Plus className="w-3 h-3 mr-1" />Add
  </Button>
</div>

{/* Progress */}
{totalSubtasks > 0 && (
  <Progress value={(completedSubtasks/totalSubtasks)*100} className="h-1 mb-3" />
)}

{/* Sub-task list */}
{subtasks.map(st => (
  <div key={st.id} className="flex items-center gap-2 py-1.5 group">
    <Checkbox
      checked={st.completed}
      onCheckedChange={() => toggleSubtask(st.id)}
      className="flex-shrink-0"
    />
    <span className={cn("flex-1 text-sm transition-all", st.completed && "line-through text-foreground-tertiary opacity-60")}>
      {st.title}
    </span>
    {st.assignee && (
      <Avatar className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <AvatarFallback className="text-[9px]">{initials(st.assignee.name)}</AvatarFallback>
      </Avatar>
    )}
    {st.due_date && (
      <span className={cn("text-xs opacity-0 group-hover:opacity-100 transition-opacity",
        isOverdue(st.due_date) ? "text-destructive" : "text-foreground-tertiary")}>
        {format(new Date(st.due_date), 'MMM d')}
      </span>
    )}
  </div>
))}

{/* Inline add subtask */}
{addingSubtask && (
  <div className="flex items-center gap-2 mt-1 animate-slide-up">
    <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
    <input
      autoFocus
      placeholder="Sub-task title..."
      className="flex-1 text-sm bg-transparent border-none outline-none"
      onKeyDown={e => {
        if (e.key === 'Enter') createSubtask(e.currentTarget.value)
        if (e.key === 'Escape') setAddingSubtask(false)
      }}
      onBlur={() => setAddingSubtask(false)}
    />
  </div>
)}
```

---

## Section 6 — Attachments

`px-6 py-4 border-t border-border`

```tsx
<div className="flex items-center justify-between mb-3">
  <p className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">Attachments</p>
  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => fileInputRef.current?.click()}>
    <Upload className="w-3 h-3 mr-1" />Upload
  </Button>
  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
</div>

{/* Drop zone */}
<div
  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
  onDragLeave={() => setDragOver(false)}
  onDrop={handleDrop}
  className={cn(
    "border-2 border-dashed rounded-lg p-4 text-center text-xs text-foreground-tertiary transition-all duration-150 mb-3",
    dragOver ? "border-primary bg-primary-subtle/20 text-primary" : "border-border"
  )}
>
  <Paperclip className="w-4 h-4 mx-auto mb-1" />
  Drop files here
</div>

{/* Attachment grid */}
{attachments.length > 0 && (
  <div className="grid grid-cols-3 gap-2">
    {attachments.map(a => (
      <div key={a.id} className="group relative rounded-lg overflow-hidden border border-border aspect-square bg-muted">
        {a.is_image ? (
          <img src={a.url} alt={a.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
            <FileText className="w-6 h-6 text-foreground-tertiary" />
            <span className="text-[10px] text-foreground-tertiary text-center truncate w-full">{a.filename}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => downloadAttachment(a)} className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors">
            <Download className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={() => deleteAttachment(a.id)} className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    ))}
  </div>
)}
```

---

## Section 7 — Activity & Comments tabs

`px-6 py-4 border-t border-border flex-1`

```tsx
<Tabs defaultValue="comments">
  <TabsList className="h-8 mb-4">
    <TabsTrigger value="comments" className="text-xs">
      Comments {task.comments_count > 0 && `(${task.comments_count})`}
    </TabsTrigger>
    <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
  </TabsList>

  <TabsContent value="comments">
    {/* Comment input at TOP */}
    <div className="flex gap-3 mb-5">
      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-[10px]">{initials(currentUser.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring transition-all">
        <div
          contentEditable
          ref={commentRef}
          data-placeholder="Leave a comment... use @ to mention"
          className={cn(
            "min-h-[60px] p-3 text-sm outline-none",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-foreground-muted"
          )}
          onInput={handleMentionDetect}
        />
        {/* Mention popover */}
        {mentionOpen && (
          <div className="border-t border-border p-1 animate-slide-up">
            {filteredMembers.map(m => (
              <button key={m.id} onClick={() => insertMention(m)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm">
                <Avatar className="w-5 h-5"><AvatarFallback className="text-[9px]">{initials(m.name)}</AvatarFallback></Avatar>
                {m.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 px-3 py-2 border-t border-border bg-muted/30">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearComment}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={postComment}>Post</Button>
        </div>
      </div>
    </div>

    {/* Comments list */}
    <div className="space-y-4">
      {comments.map(c => (
        <div key={c.id} className="flex gap-3 group animate-fade-in">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarFallback className="text-[10px]">{initials(c.author.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{c.author.name}</span>
              <span className="text-xs text-foreground-tertiary">{formatRelativeTime(c.created_at)}</span>
              {c.edited && <span className="text-xs text-foreground-tertiary">(edited)</span>}
            </div>
            <p className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightMentions(c.body) }}
            />
            {/* Actions on hover */}
            <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Edit</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive">Delete</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </TabsContent>

  <TabsContent value="activity">
    <div className="space-y-3">
      {activityLogs.map(log => (
        <div key={log.id} className="flex gap-3 text-sm">
          <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
            <AvatarFallback className="text-[9px]">{initials(log.actor.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <span className="font-medium">{log.actor.name}</span>
            {' '}<span className="text-foreground-secondary">{log.description}</span>
            {log.old_value && log.new_value && (
              <span className="inline-flex items-center gap-1 text-xs ml-1">
                <span className="bg-muted px-1.5 py-0.5 rounded line-through text-foreground-tertiary">{log.old_value}</span>
                <ArrowRight className="w-3 h-3 text-foreground-muted" />
                <span className={cn("px-1.5 py-0.5 rounded", getStatusColor(log.new_value))}>{log.new_value}</span>
              </span>
            )}
            <p className="text-xs text-foreground-tertiary mt-0.5">{formatRelativeTime(log.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  </TabsContent>
</Tabs>
```

---

## Mention highlighting helper

```ts
function highlightMentions(text: string): string {
  return text.replace(
    /@(\w+)/g,
    '<span class="text-primary-subtle-foreground bg-primary-subtle rounded px-0.5 font-medium">@$1</span>'
  )
}
```

---

## Auto-save behavior

All field changes (title, description, metadata) call the PATCH /tasks/{id} endpoint:
- Title/description: debounced 800ms after last keystroke
- Status/priority/assignee/dates: immediate on selection
- Show a subtle "Saving..." → "Saved" indicator in the sheet header when syncing

---

## Verification checklist

- [ ] Sheet slides in from right and doesn't cover the full board
- [ ] Title auto-resizes as text grows
- [ ] Status/priority/assignee/date selectors all open and update the task
- [ ] Metadata grid fields are all clickable and open correct pickers
- [ ] Sub-task list renders with progress bar, checkbox completes sub-tasks
- [ ] Inline sub-task add works (Enter saves, Esc cancels)
- [ ] File drop zone activates on drag-over, files upload on drop
- [ ] Attachment grid shows thumbnails for images, icons for other files
- [ ] Comments tab: input works, @mention popover appears, comments post
- [ ] Activity tab: shows formatted log entries with before/after values
- [ ] Auto-save fires after title/description changes
- [ ] Light and dark mode both render correctly
- [ ] Mobile: sheet is full-width, metadata grid is single column
