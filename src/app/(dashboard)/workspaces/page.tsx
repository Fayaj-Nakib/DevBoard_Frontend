'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .finally(() => setLoading(false));
  }, []);

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/workspaces', { name: newName });
      setWorkspaces((prev) => [...prev, data]);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">DevBoard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Workspaces</h2>
        </div>

        <form onSubmit={createWorkspace} className="flex gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New workspace name..."
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading workspaces...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-gray-400 text-sm">No workspaces yet. Create one above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <h3 className="font-medium text-gray-800">{ws.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{ws.slug}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}