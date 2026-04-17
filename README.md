# DevBoard Web

> Next.js frontend for DevBoard — a SaaS-style Kanban project management tool.

[![Web CI](https://github.com/YOUR_GITHUB_USERNAME/devboard-web/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/devboard-web/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

## What is DevBoard?

DevBoard is a full-stack project management tool inspired by tools like Linear and Trello. Teams can create **workspaces**, organise work into **projects**, and manage **tasks** on a drag-and-drop Kanban board.

This repository is the **Next.js 16 / React 19 frontend**. The Laravel API lives in a separate repo — see [devboard-api](https://github.com/YOUR_GITHUB_USERNAME/devboard-api).

**Live demo:** https://devboard.vercel.app

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Drag & Drop | @hello-pangea/dnd |
| HTTP Client | Axios (Bearer token interceptor) |
| Auth | Token in localStorage + React Context |
| Deployment | Vercel |
| CI/CD | GitHub Actions — ESLint + tsc + next build |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Client Browser                     │
└──────────────────────┬───────────────────────────────┘
                       │  HTTPS
                       ▼
┌──────────────────────────────────────────────────────┐
│          Next.js 16 Frontend  (Vercel)               │
│   React 19 · Tailwind CSS 4 · @hello-pangea/dnd      │
└──────────────────────┬───────────────────────────────┘
                       │  REST + Bearer token
                       ▼
┌──────────────────────────────────────────────────────┐
│          Laravel 13 API  (Render / Docker)           │
│   Sanctum · Eloquent · Queue jobs · Mailable         │
└────────────┬─────────────────────────┬───────────────┘
             │                         │
             ▼                         ▼
┌─────────────────────┐   ┌────────────────────────┐
│  PostgreSQL (Neon)  │   │  Gmail SMTP (email)    │
└─────────────────────┘   └────────────────────────┘
```

---

## Screenshots

<!-- Add screenshots here. Suggested shots:
     - Login page
     - Workspace list
     - Project list within a workspace
     - Kanban board with tasks in multiple columns
     - Task detail modal (comments, due date, priority)
     - Notifications bell open
-->

_Screenshots coming soon._

---

## Pages & Components

| Path | Description |
|------|-------------|
| `/` | Redirect to `/workspaces` (or login) |
| `/login` | Token-based login |
| `/register` | New account creation |
| `/workspaces` | List all workspaces you belong to |
| `/workspaces/[id]/projects` | Projects within a workspace |
| `/workspaces/[id]/projects/[id]` | Kanban board for a project |

**Key components:**

- `KanbanBoard` — drag-and-drop columns (To Do / In Progress / Done) powered by `@hello-pangea/dnd`; fires a bulk reorder request on every drop
- `TaskDetailModal` — edit title, status, priority, due date, description; full comments CRUD
- `NotificationsBell` — polls every 30 s; shows unread badge; mark-one / mark-all-read dropdown
- `AuthContext` — token stored in localStorage; axios interceptor injects `Authorization: Bearer` header on every request

---

## Local Setup

### Prerequisites

- Node.js 20+
- The [devboard-api](https://github.com/YOUR_GITHUB_USERNAME/devboard-api) running locally on port 8000

### Steps

```bash
# 1. Clone
git clone https://github.com/YOUR_GITHUB_USERNAME/devboard-web.git
cd devboard-web

# 2. Install dependencies
npm install

# 3. Configure environment
#    Create .env.local (already gitignored):
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api" > .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api` | Full URL of the Laravel API |

In production (Vercel), set `NEXT_PUBLIC_API_URL` to your Render service URL, e.g. `https://devboard-api.onrender.com/api`.

---

## Deployment

The frontend is deployed on **Vercel**.

```bash
# Install Vercel CLI (optional, for manual deploys)
npm i -g vercel
vercel
```

Or connect the GitHub repo to Vercel and set:
- `NEXT_PUBLIC_API_URL` → your Render API URL

Vercel will run `npm run build` automatically on every push to `main`.

---

## CI/CD

Three checks run on every push and PR to `main` / `develop`:

1. **Lint** — `npm run lint` (ESLint with `eslint-config-next`)
2. **Type-check** — `tsc --noEmit` (zero type errors enforced)
3. **Build** — `next build` (production build must succeed)

Add the badge to your GitHub profile by replacing `YOUR_GITHUB_USERNAME` in the badge URL at the top of this file.

---

## Why These Choices?

**Next.js App Router over plain React / Vite** — file-based routing, server components, and Vercel deployment with zero config. The App Router's nested layouts made the `(auth)` / `(dashboard)` split clean.

**React 19** — concurrent features and the updated form event types. Note: `FormEvent` must be typed as `React.FormEvent<HTMLFormElement>` — the bare `React.FormEvent` overload is deprecated in React 19.

**Tailwind CSS 4** — utility-first styling with no runtime overhead. v4 ships with a PostCSS plugin and removes the `tailwind.config.js` requirement.

**@hello-pangea/dnd over react-beautiful-dnd** — `react-beautiful-dnd` is unmaintained and broken under React 18+. `@hello-pangea/dnd` is the community-maintained fork with full React 18/19 support.

**Axios over fetch** — request/response interceptors for auth headers and error normalisation without boilerplate in every call site.

**Token in localStorage over cookies** — simpler cross-origin setup for a decoupled SPA + API architecture. The API is on a different domain (Render) from the frontend (Vercel), so `HttpOnly` cookies require extra CORS + SameSite config. A Bearer token sidesteps that entirely for a v1.
