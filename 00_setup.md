# Prompt 00 — Design System Setup

Read `DEVBOARD_ROADMAP.md` for project context.
Read `DESIGN_SYSTEM.md` for the full token and convention reference.

## Context
shadcn is already installed using the **Base / Nova preset** which includes:
- Geist font (already configured — do NOT reinstall)
- Lucide React icons (already configured — do NOT reinstall)

Do not re-run `shadcn init`. Do not install Geist or Lucide separately.

---

## Step 1 — Install additional dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install class-variance-authority clsx tailwind-merge
npm install next-themes
npm install date-fns
npm install cmdk
npm install recharts
```

---

## Step 2 — Replace globals.css

Replace the entire contents of `globals.css` (or `app/globals.css`) with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --background-secondary: 240 5% 96%;
    --background-tertiary: 240 6% 92%;

    --foreground: 240 10% 4%;
    --foreground-secondary: 240 4% 36%;
    --foreground-tertiary: 240 4% 54%;
    --foreground-muted: 240 4% 70%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 4%;

    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 4%;

    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 262 83% 52%;
    --primary-subtle: 262 83% 97%;
    --primary-subtle-foreground: 262 83% 40%;

    --secondary: 240 5% 94%;
    --secondary-foreground: 240 6% 10%;

    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 54%;

    --accent: 240 5% 94%;
    --accent-foreground: 240 6% 10%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --destructive-subtle: 0 84% 97%;

    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --success-subtle: 142 71% 96%;

    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --warning-subtle: 38 92% 96%;

    --border: 240 6% 90%;
    --border-strong: 240 6% 82%;
    --input: 240 6% 90%;
    --ring: 262 83% 58%;

    --sidebar: 240 6% 98%;
    --sidebar-foreground: 240 10% 4%;
    --sidebar-border: 240 6% 92%;
    --sidebar-accent: 240 5% 94%;
    --sidebar-accent-foreground: 240 6% 10%;

    --topnav: 0 0% 100%;
    --topnav-border: 240 6% 90%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 240 6% 7%;
    --background-secondary: 240 5% 10%;
    --background-tertiary: 240 4% 13%;

    --foreground: 0 0% 95%;
    --foreground-secondary: 240 4% 68%;
    --foreground-tertiary: 240 4% 50%;
    --foreground-muted: 240 4% 36%;

    --card: 240 5% 10%;
    --card-foreground: 0 0% 95%;

    --popover: 240 5% 11%;
    --popover-foreground: 0 0% 95%;

    --primary: 262 83% 65%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 262 83% 70%;
    --primary-subtle: 262 83% 14%;
    --primary-subtle-foreground: 262 83% 75%;

    --secondary: 240 4% 14%;
    --secondary-foreground: 0 0% 90%;

    --muted: 240 4% 14%;
    --muted-foreground: 240 4% 50%;

    --accent: 240 4% 14%;
    --accent-foreground: 0 0% 90%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --destructive-subtle: 0 72% 12%;

    --success: 142 71% 40%;
    --success-subtle: 142 71% 10%;

    --warning: 38 92% 50%;
    --warning-subtle: 38 92% 11%;

    --border: 240 4% 17%;
    --border-strong: 240 4% 22%;
    --input: 240 4% 17%;
    --ring: 262 83% 65%;

    --sidebar: 240 6% 8%;
    --sidebar-foreground: 0 0% 90%;
    --sidebar-border: 240 4% 13%;
    --sidebar-accent: 240 4% 12%;
    --sidebar-accent-foreground: 0 0% 90%;

    --topnav: 240 6% 8%;
    --topnav-border: 240 4% 13%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { @apply bg-border rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-border-strong; }
}
```

---

## Step 3 — Update tailwind.config

Add these to `theme.extend` in `tailwind.config.js` or `tailwind.config.ts`:

```js
colors: {
  'background-secondary':          'hsl(var(--background-secondary))',
  'background-tertiary':           'hsl(var(--background-tertiary))',
  'foreground-secondary':          'hsl(var(--foreground-secondary))',
  'foreground-tertiary':           'hsl(var(--foreground-tertiary))',
  'foreground-muted':              'hsl(var(--foreground-muted))',
  'border-strong':                 'hsl(var(--border-strong))',
  'primary-subtle':                'hsl(var(--primary-subtle))',
  'primary-subtle-foreground':     'hsl(var(--primary-subtle-foreground))',
  'success':                       'hsl(var(--success))',
  'success-foreground':            'hsl(var(--success-foreground))',
  'success-subtle':                'hsl(var(--success-subtle))',
  'warning':                       'hsl(var(--warning))',
  'warning-foreground':            'hsl(var(--warning-foreground))',
  'warning-subtle':                'hsl(var(--warning-subtle))',
  'destructive-subtle':            'hsl(var(--destructive-subtle))',
  'sidebar':                       'hsl(var(--sidebar))',
  'sidebar-foreground':            'hsl(var(--sidebar-foreground))',
  'sidebar-border':                'hsl(var(--sidebar-border))',
  'sidebar-accent':                'hsl(var(--sidebar-accent))',
  'sidebar-accent-foreground':     'hsl(var(--sidebar-accent-foreground))',
  'topnav':                        'hsl(var(--topnav))',
  'topnav-border':                 'hsl(var(--topnav-border))',
},
animation: {
  'fade-in':        'fadeIn 0.15s ease-out',
  'slide-up':       'slideUp 0.15s ease-out',
  'slide-in-right': 'slideInRight 0.2s ease-out',
},
keyframes: {
  fadeIn:        { from: { opacity: '0' },                                    to: { opacity: '1' } },
  slideUp:       { from: { transform: 'translateY(4px)', opacity: '0' },      to: { transform: 'translateY(0)', opacity: '1' } },
  slideInRight:  { from: { transform: 'translateX(8px)', opacity: '0' },      to: { transform: 'translateX(0)', opacity: '1' } },
},
```

---

## Step 4 — Install shadcn components

Run this single command to install all components needed across all pages:

```bash
npx shadcn@latest add button input label textarea select checkbox radio-group switch badge avatar dropdown-menu context-menu dialog sheet popover tooltip command separator scroll-area progress skeleton tabs card table form alert-dialog hover-card collapsible calendar
```

---

## Step 5 — Create lib/utils.ts

Create or update `lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    todo:        'text-foreground-tertiary bg-muted',
    in_progress: 'text-primary-subtle-foreground bg-primary-subtle',
    done:        'text-success bg-success-subtle',
    cancelled:   'text-destructive bg-destructive-subtle',
    blocked:     'text-warning bg-warning-subtle',
  }
  return map[status] ?? 'text-foreground-tertiary bg-muted'
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'text-destructive',
    high:   'text-warning',
    medium: 'text-primary',
    low:    'text-foreground-muted',
  }
  return map[priority] ?? 'text-foreground-muted'
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function isOverdue(dueDate: string | Date | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}
```

---

## Step 6 — Theme provider setup

Install next-themes (already done in Step 1). Wrap the root layout:

```tsx
// app/layout.tsx or root layout file
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Create `components/theme-toggle.tsx`:

```tsx
'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

---

## Step 7 — App layout shell

Create `components/layout/app-layout.tsx` — the master shell for all authenticated pages:

```tsx
'use client'
import { useState } from 'react'
import { TopNav } from './top-nav'
import { Sidebar } from './sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(p => !p)}
        />
        <main className="flex-1 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
```

Create `components/layout/top-nav.tsx`:

Structure (do not invent logic — wire to real auth/workspace data):
- Height: `h-[52px]`
- Classes: `fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-topnav border-b border-topnav-border`
- LEFT: DevBoard logo (bold text "DevBoard" with a small violet square icon) + workspace switcher dropdown
- CENTER: Breadcrumb (shadcn Breadcrumb) showing current page context
- RIGHT: Search trigger button (Cmd+K shortcut hint) + Bell icon with unread badge + ThemeToggle + User avatar dropdown (Profile, Settings, Logout)

Create `components/layout/sidebar.tsx`:

Structure:
- Width: `w-[240px]` expanded, `w-[52px]` collapsed — `transition-all duration-200`
- Classes: `h-full bg-sidebar border-r border-sidebar-border flex flex-col`
- TOP: Workspace avatar + name (hidden when collapsed)
- NAV SECTIONS (each a collapsible group):
  - My Work — Home, My Tasks, Notifications
  - Projects — list of workspace projects with color dot + name (hidden when collapsed, show only dots)
  - Favorites — starred items
- BOTTOM: Collapse toggle button (ChevronLeft / ChevronRight)
- Active nav item: `bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary rounded-r-md`

---

## Verification checklist

Before moving to Prompt 01, confirm all of these:

- [ ] `npm run dev` starts without errors
- [ ] Light mode renders correctly (white bg, dark text)
- [ ] Dark mode renders correctly (toggle the ThemeToggle)
- [ ] Geist font is loading (check in browser devtools → Elements → body font)
- [ ] At least one shadcn component renders (add a `<Button>Test</Button>` to a page temporarily)
- [ ] AppLayout shell renders on any authenticated page (TopNav visible, Sidebar visible)
- [ ] No TypeScript errors in the new files
