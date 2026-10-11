# DevBoard UI Redesign — Prompt System

## Setup completed
- shadcn installed with **Base / Nova preset** (Lucide + Geist already configured)
- Do NOT reinstall Geist or Lucide — Nova preset handles both

## File map

| File | What it does | Paste to |
|------|-------------|----------|
| `DESIGN_SYSTEM.md` | Tokens, conventions, shared rules — reference only | Keep open as context |
| `00_setup.md` | CSS tokens, tailwind config, utilities, layout shell | Claude Code first |
| `01_auth.md` | Login, Register, Forgot Password, Reset Password | After 00 |
| `02_dashboard.md` | Home page, stats, my tasks, projects grid | After 00 |
| `03_board.md` | Kanban board, columns, task cards, drag-and-drop | After 00 |
| `04_task_detail.md` | Task detail sheet, metadata, comments, activity | After 00 |
| `05_settings.md` | Project settings, members, statuses, labels, automations | After 00 |
| `06_remaining.md` | List, Backlog, Timeline, Sprint, Analytics, Workload, Search, Notifications | After all above |

## Rules
1. Always start with `00_setup.md` — every other prompt references its tokens
2. Complete one prompt fully before starting the next
3. After each prompt: verify light + dark mode both render correctly
4. Never re-run setup steps from `00_setup.md` in later prompts

## Design direction
Combines the best of:
- **Linear** — clean typography, excellent dark mode, fast-feeling, minimal chrome
- **Jira** — information density, top nav + sidebar layout, rich metadata
- **Notion** — editorial whitespace, soft light mode, inline editing

Layout: **Top nav bar + collapsible left sidebar** (Jira structure, Linear aesthetics)
Component library: **shadcn/ui (Nova/Base preset)**
Icons: **Lucide React** (included in Nova)
Font: **Geist** (included in Nova)
Motion: **Smooth micro-interactions on key actions only**
Modes: **Light + Dark with toggle**
