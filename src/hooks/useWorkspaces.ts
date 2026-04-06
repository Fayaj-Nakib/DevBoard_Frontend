import { useEffect, useState } from 'react';
import api from '@/lib/api';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .finally(() => setLoading(false));
  }, []);

  const create = async (name: string) => {
    const { data } = await api.post('/workspaces', { name });
    setWorkspaces((prev: any) => [...prev, data]);
    return data;
  };

  return { workspaces, loading, create };
}