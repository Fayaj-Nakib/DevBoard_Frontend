import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .finally(() => setLoading(false));
  }, []);

  const create = async (name: string) => {
    const { data } = await api.post('/workspaces', { name });
    setWorkspaces((prev) => [...prev, data]);
    return data;
  };

  return { workspaces, loading, create };
}