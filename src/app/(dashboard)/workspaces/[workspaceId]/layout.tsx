import { AppShell } from '@/components/layout';

/**
 * Workspace-scoped layout — wraps all routes under /workspaces/[workspaceId]/
 * with the AppShell (TopNav + collapsible Sidebar).
 *
 * params is a Promise in Next.js 16 — must be awaited.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <AppShell workspaceId={workspaceId}>{children}</AppShell>;
}
