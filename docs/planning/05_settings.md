# Prompt 05 — Project Settings

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
`00_setup.md` is complete. AppLayout is in place.

## Route
`/projects/[id]/settings` — nested layout with its own left nav

---

## Page layout

Two-column: settings nav (left) + content area (right).

```tsx
<div className="flex h-[calc(100vh-52px)]">
  <SettingsNav />          {/* sticky left, 220px */}
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-2xl mx-auto px-8 py-8">
      {children}           {/* tab content */}
    </div>
  </div>
</div>
```

---

## Settings nav

`w-[220px] flex-shrink-0 h-full overflow-y-auto border-r border-border bg-background-secondary py-4 px-3`

Back link at top:
```tsx
<Link href={`/projects/${projectId}/board`}
  className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground mb-5 px-2 transition-colors">
  <ChevronLeft className="w-4 h-4" />{project.name}
</Link>
```

Nav sections — each group has a label + items:
```tsx
function NavItem({ href, icon: Icon, label, danger }: NavItemProps) {
  const isActive = pathname === href
  return (
    <Link href={href} className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150",
      isActive
        ? "bg-sidebar-accent text-foreground font-medium border-l-2 border-primary rounded-l-none"
        : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
      danger && !isActive && "text-destructive hover:bg-destructive-subtle"
    )}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  )
}
```

Nav groups:
```
GENERAL
  General          (Settings)
  Members          (Users)
  Roles            (Shield)

WORKFLOW
  Statuses         (Columns2)
  Labels           (Tag)
  Custom fields    (Sliders)
  Templates        (Copy)

PLANNING
  Sprints          (Zap)
  Milestones       (Flag)

INTEGRATIONS
  Automations      (Workflow)
  Webhooks         (Webhook)

DANGER ZONE
  Archive project  (Archive)    — text-warning
  Delete project   (Trash2)     — text-destructive
```

Group label style: `text-[10px] font-semibold uppercase tracking-widest text-foreground-muted px-3 pt-4 pb-1`

---

## Tab: General `/settings/general`

Page heading:
```tsx
<div className="mb-8">
  <h1 className="text-xl font-semibold">General</h1>
  <p className="text-sm text-foreground-tertiary mt-1">Manage your project settings</p>
</div>
```

### Card: Project details

```tsx
<Card className="mb-6">
  <CardHeader className="pb-4">
    <CardTitle className="text-base">Project details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-5">
    {/* Project name */}
    <div className="space-y-1.5">
      <Label htmlFor="name">Project name</Label>
      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
    </div>
    {/* Description */}
    <div className="space-y-1.5">
      <Label htmlFor="desc">Description</Label>
      <Textarea id="desc" value={description} rows={3} onChange={e => setDescription(e.target.value)} />
    </div>
    {/* Color */}
    <div className="space-y-1.5">
      <Label>Project color</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {PROJECT_COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className={cn("w-7 h-7 rounded-full transition-all duration-150",
              color === c && "ring-2 ring-offset-2 ring-primary scale-110")}
            style={{ background: c }}
          />
        ))}
        {/* Custom hex input */}
        <div className="relative">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" />
          <div className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-border-strong transition-colors">
            <Plus className="w-3 h-3 text-foreground-tertiary" />
          </div>
        </div>
      </div>
    </div>
    {/* Identifier */}
    <div className="space-y-1.5">
      <Label>Project identifier</Label>
      <div className="flex items-center">
        <span className="px-3 h-9 bg-muted border border-r-0 border-input rounded-l-md text-sm text-foreground-secondary flex items-center">
          {project.identifier_prefix}-
        </span>
        <Input value={identifierSuffix} onChange={e => setIdentifierSuffix(e.target.value.toUpperCase())}
          className="rounded-l-none" maxLength={6} />
      </div>
      <p className="text-xs text-foreground-tertiary">Used in task IDs e.g. DEV-42</p>
    </div>
  </CardContent>
  <CardFooter className="border-t border-border pt-4">
    <Button onClick={saveGeneral} disabled={saving}>
      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Save changes
    </Button>
  </CardFooter>
</Card>
```

### Card: Danger zone

```tsx
<Card className="border-destructive/40">
  <CardHeader className="pb-3">
    <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Archive */}
    <div className="flex items-center justify-between py-3 border-b border-border">
      <div>
        <p className="text-sm font-medium">Archive this project</p>
        <p className="text-xs text-foreground-tertiary mt-0.5">Hide from active projects. Can be restored later.</p>
      </div>
      <Button variant="outline" size="sm" className="border-warning text-warning hover:bg-warning-subtle">
        <Archive className="w-4 h-4 mr-1.5" />Archive
      </Button>
    </div>
    {/* Delete */}
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">Delete this project</p>
        <p className="text-xs text-foreground-tertiary mt-0.5">Permanently delete all tasks, sprints, and data. Cannot be undone.</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-1.5" />Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all tasks, sprints, members, and activity. This cannot be undone.
              <br /><br />
              Type <strong>{project.name}</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={project.name} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={confirmName !== project.name} onClick={deleteProject}
              className="bg-destructive hover:bg-destructive/90">
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </CardContent>
</Card>
```

---

## Tab: Members `/settings/members`

Page header + "Invite member" Button.

Invite form (collapsible, expands on button click):
```tsx
{inviteOpen && (
  <Card className="mb-6 animate-slide-up">
    <CardContent className="pt-5">
      <div className="flex gap-3">
        <Input placeholder="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-1" />
        <Select value={inviteRole} onValueChange={setInviteRole}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={sendInvite}>Send invite</Button>
      </div>
    </CardContent>
  </Card>
)}
```

Members table:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Member</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Joined</TableHead>
      <TableHead></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {members.map(m => (
      <TableRow key={m.id} className="hover:bg-accent/30 transition-colors">
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                {m.name}
                {m.id === currentUser.id && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                {m.is_owner && <Badge variant="secondary" className="text-[10px]">Owner</Badge>}
              </p>
              <p className="text-xs text-foreground-tertiary">{m.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Select defaultValue={m.role} disabled={m.is_owner || m.id === currentUser.id}
            onValueChange={role => updateMemberRole(m.id, role)}>
            <SelectTrigger className="h-7 w-28 text-xs border-transparent hover:border-border transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-xs text-foreground-tertiary">
          {format(new Date(m.joined_at), 'MMM d, yyyy')}
        </TableCell>
        <TableCell>
          {m.id !== currentUser.id && !m.is_owner && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive-subtle hover:text-destructive"
              onClick={() => removeMember(m.id)}>
              Remove
            </Button>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Tab: Statuses `/settings/statuses`

Drag-to-reorder list using @dnd-kit/sortable.

```tsx
<DndContext sensors={sensors} onDragEnd={handleReorder}>
  <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
    <div className="space-y-1.5">
      {statuses.map(s => <SortableStatusRow key={s.id} status={s} />)}
    </div>
  </SortableContext>
</DndContext>
```

Each `SortableStatusRow`:
```tsx
<div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-border-strong transition-all group">

  {/* Drag handle */}
  <div {...listeners} className="cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <GripVertical className="w-4 h-4 text-foreground-muted" />
  </div>

  {/* Color picker */}
  <Popover>
    <PopoverTrigger asChild>
      <button className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-border-strong transition-all"
        style={{ background: status.color }} />
    </PopoverTrigger>
    <PopoverContent className="w-auto p-3">
      <div className="grid grid-cols-4 gap-2">
        {STATUS_COLORS.map(c => (
          <button key={c} onClick={() => updateStatus(status.id, { color: c })}
            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
            style={{ background: c }} />
        ))}
      </div>
    </PopoverContent>
  </Popover>

  {/* Inline name edit */}
  <input
    value={status.name}
    onChange={e => updateStatusLocal(status.id, { name: e.target.value })}
    onBlur={() => saveStatus(status.id)}
    className="flex-1 text-sm bg-transparent border-none outline-none focus:bg-muted rounded px-2 py-1 -mx-2 transition-colors"
  />

  {/* Done toggle */}
  <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
    <span>Done</span>
    <Switch
      checked={status.is_done}
      onCheckedChange={v => updateStatus(status.id, { is_done: v })}
      className="scale-75"
    />
  </div>

  {/* Default badge */}
  {status.is_default && (
    <Badge variant="secondary" className="text-[10px]">Default</Badge>
  )}

  {/* Delete */}
  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive"
    onClick={() => deleteStatus(status.id)}>
    <X className="w-3.5 h-3.5" />
  </Button>
</div>
```

Add status button:
```tsx
<button onClick={addStatus}
  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-tertiary hover:text-foreground hover:bg-accent/50 rounded-lg transition-all w-full mt-2">
  <Plus className="w-4 h-4" />Add status
</button>
```

---

## Tab: Labels `/settings/labels`

Identical pattern to Statuses tab — same drag-to-reorder, same inline edit, same color picker.
Add a task count badge next to each label name:
```tsx
<span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full">
  {label.tasks_count} tasks
</span>
```

---

## Tab: Automations `/settings/automations`

Page header + "Create rule" Button.

Rule cards:
```tsx
{rules.map(rule => (
  <Card key={rule.id} className="mb-3 hover:border-border-strong transition-all group">
    <CardContent className="p-4 flex items-start gap-4">
      <div className="w-8 h-8 rounded-lg bg-primary-subtle flex items-center justify-center flex-shrink-0">
        <Workflow className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{rule.name}</p>
        <p className="text-xs text-foreground-tertiary mt-0.5">
          When <span className="text-foreground-secondary font-medium">{rule.trigger_label}</span>
          {' → '}
          Then <span className="text-foreground-secondary font-medium">{rule.action_label}</span>
        </p>
        {rule.last_triggered && (
          <p className="text-[10px] text-foreground-muted mt-1">
            Last triggered {formatRelativeTime(rule.last_triggered)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={rule.is_active} onCheckedChange={v => toggleRule(rule.id, v)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openRuleEditor(rule)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => deleteRule(rule.id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardContent>
  </Card>
))}
```

Empty state: Workflow icon, "No automation rules", "Create your first rule" Button.

Rule editor Sheet (side="right", w-[520px]):
- Step 1: Trigger type radio group
- Step 2: Action type radio group
- Dynamic config fields based on selection
- Rule name input at top
- Save + Cancel buttons at bottom

---

## Verification checklist

- [ ] Settings nav highlights active tab with left border accent
- [ ] General tab saves successfully and shows feedback
- [ ] Delete confirmation requires typing exact project name
- [ ] Members table shows current user with "You" badge
- [ ] Role select is disabled for owner and current user
- [ ] Statuses drag-to-reorder works and saves new order
- [ ] Status name inline edit saves on blur
- [ ] Status color picker opens and applies color
- [ ] Labels tab identical behavior to statuses
- [ ] Automation rule list renders with toggle switches
- [ ] Rule editor sheet opens and closes correctly
- [ ] Light and dark mode both render correctly
