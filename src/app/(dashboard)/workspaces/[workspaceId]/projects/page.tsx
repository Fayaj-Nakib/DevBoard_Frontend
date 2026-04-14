'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NotificationsBell from '@/components/NotificationsBell';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  tasks_count: number;
}

export default function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = () => {
    api
      .get(`/workspaces/${workspaceId}/projects`)
      .then((r) => setProjects(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/projects`, {
        name: newName,
      });
      setProjects((prev) => [...prev, data]);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/workspaces')}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Workspaces
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800">Projects</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button type="button" onClick={logout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={createProject} className="flex gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name…"
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create Project'}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-400 text-sm">No projects yet. Create one above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  router.push(`/workspaces/${workspaceId}/projects/${project.id}`)
                }
                className="bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <h3 className="font-medium text-gray-800">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    {project.tasks_count ?? 0} tasks
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
