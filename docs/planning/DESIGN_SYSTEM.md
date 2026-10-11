# DevBoard Design System Reference

> This file is context — do not execute it directly.
> Every prompt file references these conventions.

---

## Color tokens (defined in 00_setup.md)

### Backgrounds (light → dark)
- `bg-background` — main page background
- `bg-background-secondary` — sidebar, secondary panels
- `bg-background-tertiary` — hover states, subtle fills
- `bg-card` — card surfaces
- `bg-popover` — dropdowns, popovers, tooltips

### Text
- `text-foreground` — primary text
- `text-foreground-secondary` — labels, secondary info
- `text-foreground-tertiary` — timestamps, meta, placeholders
- `text-foreground-muted` — disabled, very subtle

### Primary accent — Violet
- `bg-primary` / `text-primary` — main CTA, active states
- `bg-primary-subtle` — background tint for primary elements
- `text-primary-subtle-foreground` — text on primary-subtle bg

### Status colors
- `text-success` / `bg-success-subtle` — done, completed
- `text-destructive` / `bg-destructive-subtle` — error, overdue, delete
- `text-warning` / `bg-warning-subtle` — blocked, at risk
- `bg-muted` / `text-muted-foreground` — neutral, todo

### Borders
- `border-border` — default border (subtle)
- `border-border-strong` — emphasized border on hover/focus

### Layout
- `bg-sidebar` / `bg-topnav` — structural surfaces
- `border-sidebar-border` / `border-topnav-border` — structural borders

---

## Status → color mapping

```ts
todo        → text-foreground-tertiary  bg-muted
in_progress → text-primary-subtle-foreground  bg-primary-subtle
done        → text-success  bg-success-subtle
cancelled   → text-destructive  bg-destructive-subtle
blocked     → text-warning  bg-warning-subtle
```

## Priority → color + icon mapping

```ts
urgent → text-destructive   icon: AlertCircle
high   → text-warning       icon: ArrowUp
medium → text-primary       icon: ArrowRight
low    → text-muted-foreground  icon: ArrowDown
```

---

## Typography scale

```
Page heading:      text-2xl font-semibold tracking-tight
Section heading:   text-xl font-semibold
Card title:        text-base font-medium
Body:              text-sm
Meta / labels:     text-xs text-foreground-tertiary
Section label:     text-xs font-medium uppercase tracking-wider text-foreground-tertiary
Mono (IDs, code):  font-mono text-xs
```

---

## Spacing conventions

```
Page padding:          px-6 py-6
Card padding:          p-4 or p-5
Section gap:           gap-6 (between major sections)
Item gap:              gap-3 (between list items, cards)
Inline gap:            gap-2 (icon + text, badge row)
```

---

## Interactive states

Every clickable element must have all three:
```
hover:   bg-accent/50 or shadow increase + translate-y-[-1px]
active:  scale-[0.98] or brightness-95
focus:   ring-2 ring-ring ring-offset-2
```

Transitions: always `transition-all duration-150` unless specified otherwise.

---

## Animation classes (defined in tailwind config)

```
animate-fade-in       — opacity 0→1, 150ms, ease-out
animate-slide-up      — translateY(4px)→0 + opacity, 150ms
animate-slide-in-right — translateX(8px)→0 + opacity, 200ms
```

Use for:
- Page/section mounts: `animate-fade-in`
- New list items, toasts: `animate-slide-up`
- Sheets, sidepanels: `animate-slide-in-right` (shadcn Sheet handles this)

---

## Component conventions

### Buttons
```
Primary action:    <Button variant="default">
Secondary action:  <Button variant="outline">
Destructive:       <Button variant="destructive">
Ghost/icon:        <Button variant="ghost" size="icon">
Small meta action: <Button variant="ghost" size="sm">
```

### Badges / status pills
```tsx
<span className={cn(
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
  getStatusColor(status)
)}>
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  {label}
</span>
```

### Section header pattern
```tsx
<div className="flex items-center justify-between mb-3">
  <h2 className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
    Section Name
  </h2>
  <Button variant="ghost" size="sm">Action</Button>
</div>
```

### Empty state pattern
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-10 h-10 text-foreground-muted mb-3" />
  <p className="text-sm font-medium text-foreground-secondary mb-1">Nothing here yet</p>
  <p className="text-xs text-foreground-tertiary mb-4">Descriptive message</p>
  <Button size="sm">Primary action</Button>
</div>
```

### Loading skeleton pattern
```tsx
// Always show skeletons while data is loading — never a blank page
<div className="space-y-3">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

---

## Layout shell (defined in 00_setup.md)

```
┌──────────────────────────────────────────┐
│  TopNav (h-[52px], sticky top-0 z-50)    │
├────────────┬─────────────────────────────┤
│            │                             │
│  Sidebar   │   <main>                    │
│  (240px    │   Page content here         │
│  or 52px   │   overflow-auto             │
│  collapsed)│                             │
└────────────┴─────────────────────────────┘
```

TopNav contains: Logo | Workspace switcher | Breadcrumb | Search (Cmd+K) | Notifications | Theme toggle | User avatar

Sidebar contains: Workspace name | My Work | Projects (collapsible list) | Favorites | Collapse toggle

---

## Dark mode rule

Every component must be tested in both modes.
Never hardcode `#hex` colors — always use token classes.
Test checklist before marking a component done:
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly  
- [ ] Hover states visible in both
- [ ] Text contrast passes in both
