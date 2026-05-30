'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Settings, Users, Shield, Columns2, Tag, Sliders, Copy, Zap, Flag,
  Workflow, Webhook as WebhookIcon, Archive, Trash2, ChevronLeft, Plus, X,
  GripVertical, MoreHorizontal, Loader2, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type {
  ProjectStatus, TaskTemplate, AutomationRule, AutomationTriggerType, AutomationActionType,
  ProjectMember, ProjectRole, WorkspaceMember, CustomFieldDefinition, CustomFieldType,
  Webhook, WebhookEvent,
} from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectDetail {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  color?: string;
  identifier_prefix?: string;
  github_repo?: string | null;
}

interface LabelWithCount {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  tasks_count?: number;
}

type Section =
  | 'general' | 'members' | 'roles' | 'statuses' | 'labels'
  | 'custom-fields' | 'templates' | 'sprints' | 'milestones'
  | 'automations' | 'webhooks';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = [
  '#7C3AED', '#DC2626', '#D97706', '#16A34A',
  '#2563EB', '#0891B2', '#BE185D', '#6B7280',
  '#059669', '#EA580C', '#7C2D12', '#1D4ED8',
];

const PROJECT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#06B6D4', '#84CC16', '#F59E0B',
];

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string }[] = [
  { value: 'task_created', label: 'Task created' },
  { value: 'status_changed', label: 'Status changed' },
  { value: 'due_date_reached', label: 'Due date reached' },
  { value: 'assignee_added', label: 'Assignee added' },
  { value: 'comment_added', label: 'Comment added' },
];

const ACTION_OPTIONS: { value: AutomationActionType; label: string }[] = [
  { value: 'change_status', label: 'Change status' },
  { value: 'assign_user', label: 'Assign user' },
  { value: 'add_label', label: 'Add label' },
  { value: 'post_comment', label: 'Post comment' },
  { value: 'send_notification', label: 'Send notification' },
];

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text', number: 'Number', date: 'Date',
  select: 'Select', url: 'URL', checkbox: 'Checkbox',
};

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'task.created', label: 'Task created' },
  { value: 'task.updated', label: 'Task updated' },
  { value: 'task.deleted', label: 'Task deleted' },
  { value: 'task.status_changed', label: 'Status changed' },
  { value: 'comment.created', label: 'Comment added' },
  { value: 'project.created', label: 'Project created' },
  { value: 'project.updated', label: 'Project updated' },
];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Nav ──────────────────────────────────────────────────────────────────────

interface NavItemProps {
  id: Section;
  current: Section;
  onSelect: (s: Section) => void;
  icon: React.ElementType;
  label: string;
  danger?: 'warning' | 'destructive';
}

function NavItem({ id, current, onSelect, icon: Icon, label, danger }: NavItemProps) {
  const isActive = id === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 w-full text-left',
        isActive
          ? 'bg-sidebar-accent text-foreground font-medium border-l-2 border-primary rounded-l-none'
          : 'text-foreground-secondary hover:bg-accent/50 hover:text-foreground',
        !isActive && danger === 'warning' && 'text-warning hover:bg-warning-subtle',
        !isActive && danger === 'destructive' && 'text-destructive hover:bg-destructive-subtle',
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted px-3 pt-4 pb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectSettingsPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const router = useRouter();
  const [section, setSection] = useState<Section>('general');
  const [project, setProject] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    api.get<ProjectDetail>(`/workspaces/${workspaceId}/projects/${projectId}`)
      .then((r) => setProject(r.data));
  }, [workspaceId, projectId]);

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* ── Settings Nav ── */}
      <nav className="w-[220px] flex-shrink-0 h-full overflow-y-auto border-r border-border bg-background-secondary py-4 px-3">
        <button
          type="button"
          onClick={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}`)}
          className="flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground mb-5 px-2 transition-colors w-full"
        >
          <ChevronLeft className="w-4 h-4" />
          {project?.name ?? 'Project'}
        </button>

        <NavGroup label="General">
          <NavItem id="general" current={section} onSelect={setSection} icon={Settings} label="General" />
          <NavItem id="members" current={section} onSelect={setSection} icon={Users} label="Members" />
          <NavItem id="roles" current={section} onSelect={setSection} icon={Shield} label="Roles" />
        </NavGroup>

        <NavGroup label="Workflow">
          <NavItem id="statuses" current={section} onSelect={setSection} icon={Columns2} label="Statuses" />
          <NavItem id="labels" current={section} onSelect={setSection} icon={Tag} label="Labels" />
          <NavItem id="custom-fields" current={section} onSelect={setSection} icon={Sliders} label="Custom fields" />
          <NavItem id="templates" current={section} onSelect={setSection} icon={Copy} label="Templates" />
        </NavGroup>

        <NavGroup label="Planning">
          <NavItem id="sprints" current={section} onSelect={setSection} icon={Zap} label="Sprints" />
          <NavItem id="milestones" current={section} onSelect={setSection} icon={Flag} label="Milestones" />
        </NavGroup>

        <NavGroup label="Integrations">
          <NavItem id="automations" current={section} onSelect={setSection} icon={Workflow} label="Automations" />
          <NavItem id="webhooks" current={section} onSelect={setSection} icon={WebhookIcon} label="Webhooks" />
        </NavGroup>

        <NavGroup label="Danger Zone">
          <NavItem id="general" current={section} onSelect={setSection} icon={Archive} label="Archive project" danger="warning" />
          <NavItem id="general" current={section} onSelect={setSection} icon={Trash2} label="Delete project" danger="destructive" />
        </NavGroup>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {section === 'general' && project && (
            <GeneralSection
              workspaceId={workspaceId}
              projectId={projectId}
              project={project}
              onProjectUpdate={setProject}
            />
          )}
          {section === 'members' && (
            <MembersSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {(section as string) === 'roles' && (
            <RolesSection />
          )}
          {section === 'statuses' && (
            <StatusesSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'labels' && (
            <LabelsSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'custom-fields' && (
            <CustomFieldsSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'templates' && (
            <TemplatesSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'sprints' && (
            <SprintsSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'milestones' && (
            <MilestonesSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'automations' && (
            <AutomationsSection workspaceId={workspaceId} projectId={projectId} />
          )}
          {section === 'webhooks' && (
            <WebhooksSection workspaceId={workspaceId} projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section: General ─────────────────────────────────────────────────────────

function GeneralSection({
  workspaceId, projectId, project, onProjectUpdate,
}: {
  workspaceId: string;
  projectId: string;
  project: ProjectDetail;
  onProjectUpdate: (p: ProjectDetail) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor] = useState(project.color ?? '#6366F1');
  const [saving, setSaving] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveGeneral = () => {
    setSaving(true);
    api.patch<ProjectDetail>(`/workspaces/${workspaceId}/projects/${projectId}`, {
      name: name.trim(),
      description: description.trim() || null,
      color,
    })
      .then((r) => { onProjectUpdate(r.data); toast.success('Project saved'); })
      .catch(() => toast.error('Failed to save'))
      .finally(() => setSaving(false));
  };

  const archiveProject = () => {
    setArchiving(true);
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}`, { status: 'archived' })
      .then(() => {
        toast.success('Project archived');
        router.push(`/workspaces/${workspaceId}`);
      })
      .catch(() => toast.error('Failed to archive'))
      .finally(() => setArchiving(false));
  };

  const deleteProject = () => {
    setDeleting(true);
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}`)
      .then(() => {
        toast.success('Project deleted');
        router.push(`/workspaces/${workspaceId}`);
      })
      .catch(() => { toast.error('Failed to delete'); setDeleting(false); });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">General</h1>
        <p className="text-sm text-foreground-tertiary mt-1">Manage your project settings</p>
      </div>

      {/* Project details card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <FormLabel htmlFor="proj-name">Project name</FormLabel>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel htmlFor="proj-desc">Description</FormLabel>
            <Textarea
              id="proj-desc"
              value={description}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Project color</FormLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all duration-150',
                    color === c && 'ring-2 ring-offset-2 ring-primary scale-110',
                  )}
                  style={{ background: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Custom color"
                  className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                />
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-foreground-muted transition-colors">
                  <Plus className="w-3 h-3 text-foreground-tertiary" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-4">
          <Button onClick={saveGeneral} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </Card>

      {/* Danger zone card */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Archive */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium">Archive this project</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                Hide from active projects. Can be restored later.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-warning text-warning hover:bg-warning-subtle"
                  />
                }
              >
                <Archive className="w-4 h-4 mr-1.5" />Archive
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the project from your active projects list. You can restore it later from workspace settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={archiving}
                    onClick={archiveProject}
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                  >
                    {archiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Archive project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Delete this project</p>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                Permanently delete all tasks, sprints, and data. Cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="w-4 h-4 mr-1.5" />Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all tasks, sprints, members, and activity.
                    This cannot be undone.
                    <br /><br />
                    Type <strong>{project.name}</strong> to confirm:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={project.name}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmName !== project.name || deleting}
                    onClick={deleteProject}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Delete project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Members ─────────────────────────────────────────────────────────

function MembersSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<ProjectRole>('editor');
  const [saving, setSaving] = useState(false);

  const loadMembers = () => {
    Promise.all([
      api.get<ProjectMember[]>(`/workspaces/${workspaceId}/projects/${projectId}/members`),
      api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    ]).then(([m, wm]) => {
      setMembers(m.data);
      setWsMembers(wm.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, [workspaceId, projectId]);

  const addMember = () => {
    if (!addUserId) return;
    setSaving(true);
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/members`, {
      user_id: addUserId,
      role: addRole,
    }).then(() => {
      setAddUserId('');
      setInviteOpen(false);
      loadMembers();
    }).catch(() => toast.error('Failed to add member'))
      .finally(() => setSaving(false));
  };

  const changeRole = (userId: string, role: string) => {
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`, { role })
      .then(() => loadMembers())
      .catch(() => toast.error('Failed to update role'));
  };

  const removeMember = (userId: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`)
      .then(() => loadMembers())
      .catch(() => toast.error('Failed to remove member'));
  };

  const memberIds = new Set(members.map((m) => m.user.id));
  const inviteable = wsMembers.filter((m) => !memberIds.has(m.id));

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Members</h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            Control per-project access. Workspace owners always have full access.
          </p>
        </div>
        <Button onClick={() => setInviteOpen((v) => !v)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />Add member
        </Button>
      </div>

      {inviteOpen && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex gap-3 flex-wrap">
              <select
                title="Workspace member"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 min-w-48 h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              >
                <option value="">Select workspace member…</option>
                {inviteable.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as ProjectRole)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addMember} disabled={saving || !addUserId}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add
              </Button>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {members.length === 0 && (
        <p className="text-sm text-foreground-muted text-center py-8">No explicit project members yet.</p>
      )}

      <Card>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  {m.user.name}
                  {m.user.id === currentUser?.id && (
                    <Badge variant="secondary" className="text-[10px]">You</Badge>
                  )}
                </p>
                <p className="text-xs text-foreground-tertiary">{m.user.email}</p>
              </div>
              <Select
                defaultValue={m.role}
                disabled={m.user.id === currentUser?.id}
                onValueChange={(v) => { if (v) changeRole(m.user.id, v); }}
              >
                <SelectTrigger size="sm" className="w-28 h-7 text-xs border-transparent hover:border-border transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-foreground-tertiary w-24 flex-shrink-0">
                {format(new Date(m.created_at), 'MMM d, yyyy')}
              </p>
              {m.user.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive-subtle hover:text-destructive"
                  onClick={() => removeMember(m.user.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs text-foreground-secondary space-y-1">
        <p><span className="font-medium text-foreground">Viewer</span> — read-only access to tasks and board</p>
        <p><span className="font-medium text-foreground">Editor</span> — can create and edit tasks</p>
        <p><span className="font-medium text-foreground">Manager</span> — full project access, can manage members and settings</p>
      </div>
    </div>
  );
}

// ── Section: Roles (placeholder) ─────────────────────────────────────────────

function RolesSection() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Roles</h1>
        <p className="text-sm text-foreground-tertiary mt-1">Role definitions and permissions</p>
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="space-y-4">
            {(['viewer', 'editor', 'manager'] as const).map((role) => (
              <div key={role} className="flex items-start gap-4 py-3 border-b border-border last:border-0">
                <div className="w-20 flex-shrink-0">
                  <Badge variant="secondary" className="capitalize text-xs">{role}</Badge>
                </div>
                <p className="text-sm text-foreground-secondary">
                  {role === 'viewer' && 'Read-only access to tasks and board. Cannot create or modify tasks.'}
                  {role === 'editor' && 'Can create, edit, and comment on tasks. Cannot manage project settings or members.'}
                  {role === 'manager' && 'Full project access including settings, members, and all task operations.'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sortable Status Row ───────────────────────────────────────────────────────

function SortableStatusRow({
  status,
  onUpdate,
  onDelete,
}: {
  status: ProjectStatus;
  onUpdate: (id: string, patch: Partial<ProjectStatus>) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: status.id });

  const [localName, setLocalName] = useState(status.name);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-border-strong transition-all group',
        isDragging && 'opacity-50 z-50',
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </div>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger
          className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-border-strong transition-all cursor-pointer"
          style={{ background: status.color }}
          aria-label="Change color"
        />
        <PopoverContent className="w-auto p-3">
          <div className="grid grid-cols-4 gap-2">
            {STATUS_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdate(status.id, { color: c })}
                aria-label={`Color ${c}`}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline name edit */}
      <input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => {
          if (localName.trim() && localName !== status.name) {
            onUpdate(status.id, { name: localName.trim() });
          }
        }}
        aria-label="Status name"
        className="flex-1 text-sm bg-transparent border-none outline-none focus:bg-muted rounded px-2 py-1 -mx-2 transition-colors"
      />

      {/* Done toggle */}
      <div className="flex items-center gap-2 text-xs text-foreground-tertiary flex-shrink-0">
        <span>Done</span>
        <Switch
          size="sm"
          checked={status.is_done}
          onCheckedChange={(v) => onUpdate(status.id, { is_done: v })}
        />
      </div>

      {/* Default badge */}
      {status.is_default && (
        <Badge variant="secondary" className="text-[10px] flex-shrink-0">Default</Badge>
      )}

      {/* Delete */}
      {!status.is_default && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive flex-shrink-0"
          onClick={() => onDelete(status.id)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── Section: Statuses ────────────────────────────────────────────────────────

function StatusesSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(STATUS_COLORS[4]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadStatuses = () => {
    api.get<ProjectStatus[]>(`/workspaces/${workspaceId}/projects/${projectId}/statuses`)
      .then((r) => setStatuses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStatuses(); }, [workspaceId, projectId]);

  const updateStatus = (id: string, patch: Partial<ProjectStatus>) => {
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/statuses/${id}`, patch)
      .then(() => loadStatuses())
      .catch(() => toast.error('Failed to update status'));
  };

  const deleteStatus = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/statuses/${id}`)
      .then(() => loadStatuses())
      .catch(() => toast.error('Failed to delete status'));
  };

  const addStatus = () => {
    if (!newName.trim()) return;
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/statuses`, {
      name: newName.trim(),
      color: newColor,
      is_done: false,
    }).then(() => {
      setNewName('');
      setNewColor(STATUS_COLORS[4]);
      setAddingNew(false);
      loadStatuses();
    }).catch(() => toast.error('Failed to add status'));
  };

  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = statuses.findIndex((s) => s.id === active.id);
    const newIdx = statuses.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(statuses, oldIdx, newIdx);
    setStatuses(reordered);
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/statuses/reorder`, {
      ids: reordered.map((s) => s.id),
    }).catch(() => toast.error('Failed to save order'));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Statuses</h1>
        <p className="text-sm text-foreground-tertiary mt-1">
          Customize board columns. Drag to reorder.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {statuses.map((s) => (
              <SortableStatusRow
                key={s.id}
                status={s}
                onUpdate={updateStatus}
                onDelete={deleteStatus}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {addingNew ? (
        <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary bg-card">
          <Popover>
            <PopoverTrigger
              className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-border-strong transition-all cursor-pointer"
              style={{ background: newColor }}
              aria-label="Choose color"
            />
            <PopoverContent className="w-auto p-3">
              <div className="grid grid-cols-4 gap-2">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    aria-label={`Color ${c}`}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStatus();
              if (e.key === 'Escape') setAddingNew(false);
            }}
            placeholder="Status name…"
            aria-label="New status name"
            className="flex-1 text-sm bg-transparent border-none outline-none"
          />
          <Button size="sm" onClick={addStatus} disabled={!newName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>Cancel</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-tertiary hover:text-foreground hover:bg-accent/50 rounded-lg transition-all w-full mt-2"
        >
          <Plus className="w-4 h-4" />Add status
        </button>
      )}
    </div>
  );
}

// ── Sortable Label Row ────────────────────────────────────────────────────────

function SortableLabelRow({
  label,
  onUpdate,
  onDelete,
}: {
  label: LabelWithCount;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: label.id });

  const [localName, setLocalName] = useState(label.name);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-border-strong transition-all group',
        isDragging && 'opacity-50',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </div>

      <Popover>
        <PopoverTrigger
          className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-border-strong transition-all cursor-pointer"
          style={{ background: label.color }}
          aria-label="Change color"
        />
        <PopoverContent className="w-auto p-3">
          <div className="grid grid-cols-4 gap-2">
            {STATUS_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdate(label.id, { color: c })}
                aria-label={`Color ${c}`}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => {
          if (localName.trim() && localName !== label.name) {
            onUpdate(label.id, { name: localName.trim() });
          }
        }}
        aria-label="Label name"
        className="flex-1 text-sm bg-transparent border-none outline-none focus:bg-muted rounded px-2 py-1 -mx-2 transition-colors"
      />

      {label.tasks_count !== undefined && (
        <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
          {label.tasks_count} tasks
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive flex-shrink-0"
        onClick={() => onDelete(label.id)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Section: Labels ───────────────────────────────────────────────────────────

function LabelsSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [labels, setLabels] = useState<LabelWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(STATUS_COLORS[0]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadLabels = () => {
    api.get<LabelWithCount[]>(`/workspaces/${workspaceId}/labels`)
      .then((r) => setLabels(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLabels(); }, [workspaceId, projectId]);

  const updateLabel = (id: string, patch: { name?: string; color?: string }) => {
    api.patch(`/workspaces/${workspaceId}/labels/${id}`, patch)
      .then(() => loadLabels())
      .catch(() => toast.error('Failed to update label'));
  };

  const deleteLabel = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/labels/${id}`)
      .then(() => loadLabels())
      .catch(() => toast.error('Failed to delete label'));
  };

  const addLabel = () => {
    if (!newName.trim()) return;
    api.post(`/workspaces/${workspaceId}/labels`, {
      name: newName.trim(),
      color: newColor,
    }).then(() => {
      setNewName('');
      setNewColor(STATUS_COLORS[0]);
      setAddingNew(false);
      loadLabels();
    }).catch(() => toast.error('Failed to add label'));
  };

  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = labels.findIndex((l) => l.id === active.id);
    const newIdx = labels.findIndex((l) => l.id === over.id);
    setLabels(arrayMove(labels, oldIdx, newIdx));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Labels</h1>
        <p className="text-sm text-foreground-tertiary mt-1">
          Manage workspace labels. Drag to reorder.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
        <SortableContext items={labels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {labels.map((l) => (
              <SortableLabelRow
                key={l.id}
                label={l}
                onUpdate={updateLabel}
                onDelete={deleteLabel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {addingNew ? (
        <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary bg-card">
          <Popover>
            <PopoverTrigger
              className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-border-strong transition-all cursor-pointer"
              style={{ background: newColor }}
              aria-label="Choose color"
            />
            <PopoverContent className="w-auto p-3">
              <div className="grid grid-cols-4 gap-2">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    aria-label={`Color ${c}`}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addLabel();
              if (e.key === 'Escape') setAddingNew(false);
            }}
            placeholder="Label name…"
            aria-label="New label name"
            className="flex-1 text-sm bg-transparent border-none outline-none"
          />
          <Button size="sm" onClick={addLabel} disabled={!newName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>Cancel</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-tertiary hover:text-foreground hover:bg-accent/50 rounded-lg transition-all w-full mt-2"
        >
          <Plus className="w-4 h-4" />Add label
        </button>
      )}
    </div>
  );
}

// ── Section: Custom Fields ────────────────────────────────────────────────────

function CustomFieldsSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', field_type: 'text' as CustomFieldType, options: '', is_required: false,
  });

  const loadFields = () => {
    api.get<CustomFieldDefinition[]>(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`)
      .then((r) => setFields(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFields(); }, [workspaceId, projectId]);

  const addField = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`, {
      name: form.name.trim(),
      field_type: form.field_type,
      options: form.field_type === 'select'
        ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      is_required: form.is_required,
    }).then(() => {
      setForm({ name: '', field_type: 'text', options: '', is_required: false });
      setShowForm(false);
      loadFields();
    }).catch(() => toast.error('Failed to add field'))
      .finally(() => setSaving(false));
  };

  const deleteField = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields/${id}`)
      .then(() => loadFields())
      .catch(() => toast.error('Failed to delete field'));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Custom Fields</h1>
          <p className="text-sm text-foreground-tertiary mt-1">Add extra data fields to tasks.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />Add field
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Custom Field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FormLabel>Field name</FormLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Story URL"
                />
              </div>
              <div className="space-y-1.5">
                <FormLabel htmlFor="field-type">Field type</FormLabel>
                <select
                  id="field-type"
                  title="Field type"
                  value={form.field_type}
                  onChange={(e) => setForm({ ...form, field_type: e.target.value as CustomFieldType })}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                    <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>
            {form.field_type === 'select' && (
              <div className="space-y-1.5">
                <FormLabel>Options (comma-separated)</FormLabel>
                <Input
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  placeholder="Option A, Option B, Option C"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                className="rounded"
              />
              Required field
            </label>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 gap-2">
            <Button onClick={addField} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add field
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </CardFooter>
        </Card>
      )}

      {fields.length === 0 && !showForm && (
        <p className="text-sm text-foreground-muted text-center py-8">No custom fields yet.</p>
      )}

      <div className="space-y-1.5">
        {fields.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-border-strong transition-all group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{f.name}</p>
              {f.options && f.options.length > 0 && (
                <p className="text-xs text-foreground-muted truncate">{f.options.join(', ')}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px]">{FIELD_TYPE_LABELS[f.field_type]}</Badge>
            {f.is_required && (
              <Badge variant="destructive" className="text-[10px]">required</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive"
              onClick={() => deleteField(f.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Templates ────────────────────────────────────────────────────────

function TemplatesSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadTemplates = () => {
    api.get<TaskTemplate[]>(`/workspaces/${workspaceId}/projects/${projectId}/templates`)
      .then((r) => setTemplates(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTemplates(); }, [workspaceId, projectId]);

  const deleteTemplate = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/templates/${id}`)
      .then(() => loadTemplates())
      .catch(() => toast.error('Failed to delete template'));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-foreground-tertiary mt-1">Pre-fill new tasks with default values.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />New template
        </Button>
      </div>

      {showForm && (
        <TemplateForm
          workspaceId={workspaceId}
          projectId={projectId}
          onSave={() => { setShowForm(false); loadTemplates(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {templates.length === 0 && !showForm && (
        <p className="text-sm text-foreground-muted text-center py-8">No templates yet.</p>
      )}

      <div className="space-y-1.5">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-border-strong transition-all group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.name}</p>
              {t.default_title && (
                <p className="text-xs text-foreground-muted truncate">Title: {t.default_title}</p>
              )}
            </div>
            <Badge variant="secondary" className="capitalize text-[10px]">{t.priority}</Badge>
            {t.estimate != null && (
              <span className="text-xs text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded-full">
                {t.estimate}pt
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive"
              onClick={() => deleteTemplate(t.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateForm({
  workspaceId, projectId, onSave, onCancel,
}: {
  workspaceId: string;
  projectId: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', default_title: '', description: '',
    priority: 'medium' as TaskTemplate['priority'], estimate: '',
  });

  useEffect(() => { nameRef.current?.focus(); }, []);

  const save = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/templates`, {
      name: form.name.trim(),
      default_title: form.default_title.trim() || null,
      description: form.description.trim() || null,
      priority: form.priority,
      estimate: form.estimate ? Number(form.estimate) : null,
    }).then(() => onSave())
      .catch(() => toast.error('Failed to save template'))
      .finally(() => setSaving(false));
  };

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">New Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FormLabel>Template name *</FormLabel>
            <Input
              ref={nameRef}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Bug Report"
            />
          </div>
          <div className="space-y-1.5">
            <FormLabel>Default task title</FormLabel>
            <Input
              value={form.default_title}
              onChange={(e) => set('default_title', e.target.value)}
              placeholder="Leave blank to prompt"
            />
          </div>
          <div className="space-y-1.5">
            <FormLabel htmlFor="tmpl-priority">Priority</FormLabel>
            <select
              id="tmpl-priority"
              title="Priority"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <FormLabel>Story points</FormLabel>
            <Input
              type="number"
              min="0"
              max="9999"
              value={form.estimate}
              onChange={(e) => set('estimate', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <FormLabel>Default description</FormLabel>
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="Optional…"
          />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-4 gap-2">
        <Button onClick={save} disabled={saving || !form.name.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save template
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </CardFooter>
    </Card>
  );
}

// ── Section: Sprints ──────────────────────────────────────────────────────────

function SprintsSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [sprints, setSprints] = useState<{ id: string; name: string; status: string; start_date?: string; end_date?: string; tasks_count?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<typeof sprints>(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)
      .then((r) => setSprints(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Sprints</h1>
        <p className="text-sm text-foreground-tertiary mt-1">View and manage project sprints.</p>
      </div>

      {sprints.length === 0 && (
        <p className="text-sm text-foreground-muted text-center py-8">No sprints yet.</p>
      )}

      <div className="space-y-1.5">
        {sprints.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.name}</p>
              {(s.start_date || s.end_date) && (
                <p className="text-xs text-foreground-muted">
                  {s.start_date ? format(new Date(s.start_date), 'MMM d') : '?'}
                  {' — '}
                  {s.end_date ? format(new Date(s.end_date), 'MMM d, yyyy') : '?'}
                </p>
              )}
            </div>
            <Badge
              variant={s.status === 'active' ? 'default' : 'secondary'}
              className="capitalize text-[10px]"
            >
              {s.status}
            </Badge>
            {s.tasks_count != null && (
              <span className="text-xs text-foreground-tertiary">{s.tasks_count} tasks</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Milestones ───────────────────────────────────────────────────────

function MilestonesSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [milestones, setMilestones] = useState<{ id: string; name: string; status: string; due_date?: string; progress?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<typeof milestones>(`/workspaces/${workspaceId}/projects/${projectId}/milestones`)
      .then((r) => setMilestones(r.data))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Milestones</h1>
        <p className="text-sm text-foreground-tertiary mt-1">View and manage project milestones.</p>
      </div>

      {milestones.length === 0 && (
        <p className="text-sm text-foreground-muted text-center py-8">No milestones yet.</p>
      )}

      <div className="space-y-1.5">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.name}</p>
              {m.due_date && (
                <p className="text-xs text-foreground-muted">
                  Due {format(new Date(m.due_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            {m.progress != null && (
              <span className="text-xs text-foreground-tertiary">{m.progress}%</span>
            )}
            <Badge
              variant={m.status === 'open' ? 'default' : 'secondary'}
              className="capitalize text-[10px]"
            >
              {m.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Automations ──────────────────────────────────────────────────────

interface RuleEditorState {
  id?: string;
  name: string;
  trigger_type: AutomationTriggerType;
  action_type: AutomationActionType;
  action_value: string;
}

function AutomationsSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<RuleEditorState>({
    name: '',
    trigger_type: 'task_created',
    action_type: 'change_status',
    action_value: '',
  });
  const [saving, setSaving] = useState(false);

  const loadRules = () => {
    api.get<AutomationRule[]>(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules`)
      .then((r) => setRules(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, [workspaceId, projectId]);

  const openEditor = (rule?: AutomationRule) => {
    if (rule) {
      setEditorState({
        id: rule.id,
        name: rule.name,
        trigger_type: rule.trigger_type,
        action_type: rule.action_type,
        action_value: (rule.action_config?.value as string) ?? '',
      });
    } else {
      setEditorState({
        name: '', trigger_type: 'task_created', action_type: 'change_status', action_value: '',
      });
    }
    setEditorOpen(true);
  };

  const saveRule = () => {
    if (!editorState.name.trim()) return;
    setSaving(true);
    const payload = {
      name: editorState.name.trim(),
      trigger_type: editorState.trigger_type,
      action_type: editorState.action_type,
      action_config: editorState.action_value ? { value: editorState.action_value } : null,
    };
    const req = editorState.id
      ? api.patch(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules/${editorState.id}`, payload)
      : api.post(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules`, payload);
    req
      .then(() => { setEditorOpen(false); loadRules(); })
      .catch(() => toast.error('Failed to save rule'))
      .finally(() => setSaving(false));
  };

  const toggleRule = (id: string, is_active: boolean) => {
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules/${id}`, { is_active })
      .then(() => loadRules())
      .catch(() => toast.error('Failed to update rule'));
  };

  const deleteRule = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/automation-rules/${id}`)
      .then(() => loadRules())
      .catch(() => toast.error('Failed to delete rule'));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            Trigger actions automatically when events occur.
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="w-4 h-4 mr-1.5" />Create rule
        </Button>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Workflow className="w-6 h-6 text-foreground-muted" />
          </div>
          <p className="text-sm font-medium text-foreground">No automation rules</p>
          <p className="text-xs text-foreground-muted">
            Automate repetitive tasks by creating trigger-action rules.
          </p>
          <Button size="sm" onClick={() => openEditor()}>Create your first rule</Button>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="hover:border-border-strong transition-all group">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary-subtle flex items-center justify-center flex-shrink-0">
                <Workflow className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{rule.name}</p>
                <p className="text-xs text-foreground-tertiary mt-0.5">
                  When{' '}
                  <span className="text-foreground-secondary font-medium">
                    {TRIGGER_OPTIONS.find((t) => t.value === rule.trigger_type)?.label ?? rule.trigger_type}
                  </span>
                  {' → '}
                  Then{' '}
                  <span className="text-foreground-secondary font-medium">
                    {ACTION_OPTIONS.find((a) => a.value === rule.action_type)?.label ?? rule.action_type}
                  </span>
                </p>
                {rule.last_triggered && (
                  <p className="text-[10px] text-foreground-muted mt-1">
                    Last triggered {new Date(rule.last_triggered).toLocaleDateString()}
                    {rule.last_result && (
                      <span className={cn(
                        'ml-1.5 px-1 py-0.5 rounded',
                        rule.last_result === 'success' ? 'text-success' : 'text-destructive',
                      )}>
                        {rule.last_result}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) => toggleRule(rule.id, v)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex items-center justify-center h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-accent text-foreground-tertiary"
                    aria-label="Rule options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditor(rule)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => deleteRule(rule.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rule editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0" showCloseButton={false}>
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>{editorState.id ? 'Edit rule' : 'New automation rule'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <FormLabel>Rule name</FormLabel>
              <Input
                value={editorState.name}
                onChange={(e) => setEditorState({ ...editorState, name: e.target.value })}
                placeholder="e.g. Notify on status change"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                Trigger — When this happens
              </p>
              <div className="space-y-1">
                {TRIGGER_OPTIONS.map((t) => (
                  <label
                    key={t.value}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      editorState.trigger_type === t.value
                        ? 'border-primary bg-primary-subtle'
                        : 'border-border hover:bg-accent/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="trigger"
                      value={t.value}
                      checked={editorState.trigger_type === t.value}
                      onChange={() => setEditorState({ ...editorState, trigger_type: t.value })}
                      className="text-primary"
                    />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                Action — Then do this
              </p>
              <div className="space-y-1">
                {ACTION_OPTIONS.map((a) => (
                  <label
                    key={a.value}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      editorState.action_type === a.value
                        ? 'border-primary bg-primary-subtle'
                        : 'border-border hover:bg-accent/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={a.value}
                      checked={editorState.action_type === a.value}
                      onChange={() => setEditorState({ ...editorState, action_type: a.value })}
                      className="text-primary"
                    />
                    <span className="text-sm">{a.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <FormLabel>Action value</FormLabel>
              <Input
                value={editorState.action_value}
                onChange={(e) => setEditorState({ ...editorState, action_value: e.target.value })}
                placeholder="Optional — depends on action type"
              />
              <p className="text-xs text-foreground-muted">
                e.g. for &ldquo;Change status&rdquo; enter the status name
              </p>
            </div>
          </div>
          <SheetFooter className="border-t border-border px-6 py-4 flex-row gap-2">
            <Button onClick={saveRule} disabled={saving || !editorState.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editorState.id ? 'Save changes' : 'Create rule'}
            </Button>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Section: Webhooks ─────────────────────────────────────────────────────────

function WebhooksSection({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', url: '', events: [] as WebhookEvent[],
  });

  const loadWebhooks = () => {
    api.get<Webhook[]>(`/workspaces/${workspaceId}/projects/${projectId}/webhooks`)
      .then((r) => setWebhooks(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWebhooks(); }, [workspaceId, projectId]);

  const toggleEvent = (ev: WebhookEvent) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const createWebhook = () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/webhooks`, {
      name: form.name.trim(),
      url: form.url.trim(),
      events: form.events,
    }).then(() => {
      setForm({ name: '', url: '', events: [] });
      setFormOpen(false);
      loadWebhooks();
    }).catch(() => toast.error('Failed to create webhook'))
      .finally(() => setSaving(false));
  };

  const toggleWebhook = (id: string, is_active: boolean) => {
    api.patch(`/workspaces/${workspaceId}/projects/${projectId}/webhooks/${id}`, { is_active })
      .then(() => loadWebhooks())
      .catch(() => toast.error('Failed to update webhook'));
  };

  const deleteWebhook = (id: string) => {
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/webhooks/${id}`)
      .then(() => loadWebhooks())
      .catch(() => toast.error('Failed to delete webhook'));
  };

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Webhooks</h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            Receive HTTP POST notifications when events occur.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />Add webhook
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <FormLabel>Name</FormLabel>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Slack notifications"
              />
            </div>
            <div className="space-y-1.5">
              <FormLabel>Payload URL</FormLabel>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Events</FormLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label
                    key={ev.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                      className="rounded"
                    />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 gap-2">
            <Button
              onClick={createWebhook}
              disabled={saving || !form.name.trim() || !form.url.trim() || form.events.length === 0}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create webhook
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          </CardFooter>
        </Card>
      )}

      {webhooks.length === 0 && !formOpen && (
        <p className="text-sm text-foreground-muted text-center py-8">No webhooks configured yet.</p>
      )}

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <Card key={wh.id} className="hover:border-border-strong transition-all group">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <WebhookIcon className="w-4 h-4 text-foreground-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{wh.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-foreground-muted font-mono truncate max-w-xs">{wh.url}</p>
                  <a
                    href={wh.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${wh.url}`}
                    className="text-foreground-muted hover:text-foreground flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {wh.events.map((ev) => (
                    <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={wh.is_active}
                  onCheckedChange={(v) => toggleWebhook(wh.id, v)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-tertiary hover:text-destructive"
                  onClick={() => deleteWebhook(wh.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
