export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceMember extends User {
  role: 'owner' | 'admin' | 'member';
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  tasks_count?: number;
}

export interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date?: string;
  status: 'open' | 'closed';
  progress?: number;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status: 'planning' | 'active' | 'completed';
  progress?: number;
  velocity?: number;
  tasks_count?: number;
  done_count?: number;
}

export interface Attachment {
  id: string;
  original_name: string;
  stored_path: string;
  mime_type?: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploader?: { id: string; name: string };
  created_at: string;
}

export interface Comment {
  id: string;
  body: string;
  user: User;
  created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type RecurrenceRule = 'daily' | 'weekly' | 'weekday' | 'monthly';

export interface ProjectStatus {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  is_done: boolean;
  slug: string | null;
}

export interface TaskTemplate {
  id: string;
  project_id: string;
  name: string;
  default_title?: string;
  description?: string;
  label_ids?: string[];
  estimate?: number;
  checklist?: { title: string; done?: boolean }[];
  priority: TaskPriority;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id?: string;
  milestone_id?: string;
  sprint_id?: string;
  project_status_id?: string | null;
  recurrence_parent_id?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  due_date?: string;
  started_at?: string;
  estimate?: number;
  is_backlog?: boolean;
  backlog_position?: number | null;
  recurrence_rule?: RecurrenceRule | null;
  recurrence_ends_at?: string | null;
  assignees: User[];
  creator?: User;
  labels: Label[];
  attachments?: Attachment[];
  watchers?: User[];
  comments?: Comment[];
  children?: Task[];
  milestone?: Milestone;
  sprint?: Sprint;
  project_status?: ProjectStatus;
}

export interface TaskFilters {
  label_ids?: string[];
  assignee_ids?: string[];
  milestone_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  status?: string;
  has_subtasks?: boolean;
  is_overdue?: boolean;
  watcher_id?: string;
  sort_by?: 'due_date' | 'created_at' | 'title' | 'estimate';
  sort_dir?: 'asc' | 'desc';
}

export interface Notification {
  id: string;
  type: string;
  data: {
    message?: string;
    task_id?: string;
    task_title?: string;
    project?: string;
    action?: string;
    from?: string;
    to?: string;
    mentioned_by?: string;
    assigned_by?: string;
    comment_by?: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export interface TimelineTask {
  id: string;
  title: string;
  started_at: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimate?: number;
  assignees: { id: string; name: string }[];
  project_status: { id: string; name: string; color: string } | null;
  blocked_by_ids: string[];
}

export interface TimelineGroup {
  milestone: { id: string; name: string } | null;
  tasks: TimelineTask[];
}

// ── Calendar ─────────────────────────────────────────────────────────────────
export interface CalendarTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  started_at: string | null;
  estimate?: number;
  assignees: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  project_status: { id: string; color: string } | null;
}

// ── Burndown ─────────────────────────────────────────────────────────────────
export interface BurndownDay {
  date: string;
  remaining_points: number;
  ideal_points: number;
}

export interface BurndownData {
  sprint: { id: string; name: string; start_date: string; end_date: string; total_points: number };
  daily: BurndownDay[];
}

// ── Workload ─────────────────────────────────────────────────────────────────
export interface WorkloadTask {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: TaskPriority;
  estimate?: number;
  is_overdue: boolean;
}

export interface WorkloadMember {
  user: { id: string; name: string; email: string };
  tasks: WorkloadTask[];
  total_tasks: number;
  overdue_count: number;
  total_estimate: number;
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface ProjectStats {
  open_tasks: number;
  closed_tasks: number;
  overdue_tasks: number;
  total_tasks: number;
  completion_rate: number;
  tasks_by_status: { status_name: string; color: string; count: number }[];
  tasks_by_assignee: { id: string; name: string; count: number }[];
  tasks_created_last_30_days: number;
  tasks_completed_last_30_days: number;
  projects_count?: number;
  active_sprints_count?: number;
}

export interface VelocitySprint {
  sprint_id: string;
  sprint_name: string;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
}

export interface VelocityData {
  sprints: VelocitySprint[];
  average_velocity: number;
}
