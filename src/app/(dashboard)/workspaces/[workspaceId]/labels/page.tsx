'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Tag, X } from 'lucide-react';

import api from '@/lib/api';
import type { Label } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6B7280',
];

export default function LabelsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('#6366f1');
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    api.get<Label[]>(`/workspaces/${workspaceId}/labels`)
      .then((r) => setLabels(r.data))
      .catch(() => setLabels([]))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const createLabel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateSaving(true);
    api.post(`/workspaces/${workspaceId}/labels`, { name: createName.trim(), color: createColor })
      .then(() => {
        setCreateName('');
        setCreateColor('#6366f1');
        setCreating(false);
        refresh();
      })
      .catch(() => {})
      .finally(() => setCreateSaving(false));
  };

  const saveEdit = (id: string) => {
    api.patch(`/workspaces/${workspaceId}/labels/${id}`, { name: editName, color: editColor })
      .then(() => { setEditingId(null); refresh(); })
      .catch(() => {});
  };

  const deleteLabel = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/labels/${id}`)
      .then(() => refresh())
      .catch(() => {});
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Labels</h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            Labels are shared across all projects in this workspace.
          </p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New label
          </Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Label</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLabel} className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                    aria-label="Label color"
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                  />
                </div>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Label name"
                  autoFocus
                  className="flex-1"
                />
              </div>

              {/* Preset colors */}
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCreateColor(c)}
                    aria-label={`Color ${c}`}
                    className="transition-transform hover:scale-110 flex-shrink-0 rounded-full overflow-hidden relative"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill={c} />
                      {createColor === c && (
                        <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </button>
                ))}
              </div>

              {/* Preview */}
              {createName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted">Preview:</span>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border border-border bg-muted text-foreground-secondary">
                    <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
                      <circle cx="3" cy="3" r="3" fill={createColor} />
                    </svg>
                    {createName}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createSaving || !createName.trim()}>
                  {createSaving ? 'Creating…' : 'Create label'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Labels list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : labels.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Tag className="w-6 h-6 text-foreground-muted" />
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">No labels yet</p>
          <p className="text-xs text-foreground-tertiary mb-4">
            Create labels to organize and filter tasks across projects.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Create your first label
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-border-strong transition-all group"
            >
              {editingId === label.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    aria-label="Label color"
                    className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-background flex-shrink-0"
                  />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(label.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => saveEdit(label.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border border-border bg-muted text-foreground-secondary flex-1 min-w-0">
                    <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
                      <circle cx="3" cy="3" r="3" fill={label.color} />
                    </svg>
                    <span className="truncate">{label.name}</span>
                  </span>
                  <span className="text-xs text-foreground-muted font-mono flex-shrink-0">
                    {label.color}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => startEdit(label)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-foreground-tertiary hover:text-destructive"
                      onClick={() => deleteLabel(label.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
