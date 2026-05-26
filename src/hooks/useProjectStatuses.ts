'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ProjectStatus } from '@/types';

export function useProjectStatuses(workspaceId: string, projectId: string) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get<ProjectStatus[]>(`/workspaces/${workspaceId}/projects/${projectId}/statuses`)
      .then((r) => setStatuses(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { statuses, loading, refresh: fetch };
}
