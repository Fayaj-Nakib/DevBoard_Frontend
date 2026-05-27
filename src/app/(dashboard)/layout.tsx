'use client';

/**
 * Dashboard layout — applies to every route under (dashboard).
 *
 * The AppShell (sidebar + top nav) is mounted here. Individual pages pull their
 * workspaceId from useParams() and can pass additional nav slots via the
 * DashboardLayoutContext if needed.
 *
 * For routes that don't yet use AppShell (they have their own nav), this layout
 * is intentionally minimal — it just wraps children so Next.js is happy. Those
 * pages will be migrated page-by-page in subsequent prompts.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
