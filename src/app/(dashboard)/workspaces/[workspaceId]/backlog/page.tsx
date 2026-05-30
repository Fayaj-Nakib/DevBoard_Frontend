'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers, ArrowRight } from 'lucide-react';

import api from '@/lib/api';
import type { Project } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceBacklogPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Project[]>(`/workspaces/${workspaceId}/projects`)
      .then((r) => setProjects((r.data ?? []).filter((p) => p.status === 'active')))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3 animate-fade-in">
        <Skeleton className="h-7 w-40" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Backlog</h1>
        <p className="text-sm text-foreground-tertiary mt-1">
          Select a project to view and manage its backlog.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-foreground-muted" />
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">No active projects</p>
          <p className="text-xs text-foreground-tertiary mb-4">
            Create a project to start managing your backlog.
          </p>
          <Button size="sm" onClick={() => router.push(`/workspaces/${workspaceId}/projects`)}>
            Go to projects
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="hover:border-border-strong transition-all cursor-pointer"
              onClick={() => router.push(`/workspaces/${workspaceId}/projects/${p.id}?view=backlog`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-subtle flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-foreground-tertiary truncate">{p.description}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
