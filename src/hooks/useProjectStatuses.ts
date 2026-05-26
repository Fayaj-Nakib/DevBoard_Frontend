'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ProjectStatus } from '@/types';

export function useProjectStatuses(workspaceId: string, projectId: string) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api
      .get<ProjectStatus[]>(`/workspaces/${workspaceId}/projects/${projectId}/statuses`)
      .then((r) => setStatuses(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, version]);

  const refresh = useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { statuses, loading, refresh };
}
