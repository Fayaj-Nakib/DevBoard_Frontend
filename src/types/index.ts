export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceMember extends User {
  role: 'owner' | 'admin' | 'member' | 'guest';
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
  github_repo?: string | null;
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
  custom_field_values?: CustomFieldValue[];
  github_issue_number?: number | null;
  github_pr_number?: number | null;
  github_pr_state?: 'open' | 'closed' | 'merged' | null;
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

// ── Time tracking ─────────────────────────────────────────────────────────────
export interface TimeLog {
  id: string;
  task_id: string;
  task_title?: string;
  user: { id: string; name: string } | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  note: string | null;
  is_running: boolean;
}

export interface TaskTimeSummary {
  logs: TimeLog[];
  total_logged_minutes: number;
}

// ── Activity log ──────────────────────────────────────────────────────────────
export interface ActivityEntry {
  id: string;
  action: string;
  subject_type?: string;
  subject_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; name: string } | null;
}

export interface ActivityPage {
  data: ActivityEntry[];
  current_page: number;
  last_page: number;
  total: number;
}

// ── Global search ─────────────────────────────────────────────────────────────
export interface SearchResult {
  type: 'task' | 'project' | 'comment' | 'member';
  id: string;
  title: string;
  project_id?: string;
  project_name?: string;
  task_id?: string;
  task_title?: string;
  email?: string;
  status?: string;
  priority?: string;
  author?: string;
  description?: string;
}

export interface SearchResults {
  query: string;
  tasks: SearchResult[];
  projects: SearchResult[];
  comments: SearchResult[];
  members: SearchResult[];
}

// ── Automation rules ──────────────────────────────────────────────────────────
export type AutomationTriggerType =
  | 'task_created' | 'status_changed' | 'due_date_reached'
  | 'assignee_added' | 'comment_added';

export type AutomationActionType =
  | 'change_status' | 'assign_user' | 'add_label'
  | 'post_comment' | 'send_notification';

export interface AutomationRule {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, unknown> | null;
  action_type: AutomationActionType;
  action_config: Record<string, unknown> | null;
  last_triggered: string | null;
  last_result: 'success' | 'failed' | null;
  created_at: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
export type WebhookEvent =
  | 'task.created' | 'task.updated' | 'task.deleted'
  | 'task.status_changed' | 'comment.created'
  | 'project.created' | 'project.updated';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  is_active: boolean;
  created_at: string;
  recent_deliveries?: WebhookDelivery[];
}

export interface WebhookDelivery {
  id: string;
  event: string;
  response_status: number | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

// ── Project members (per-project roles) ───────────────────────────────────────
export type ProjectRole = 'viewer' | 'editor' | 'manager';

export interface ProjectMember {
  user: User;
  role: ProjectRole;
  created_at: string;
}

// ── Custom fields ─────────────────────────────────────────────────────────────
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'url' | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  field_type: CustomFieldType;
  options: string[] | null;
  position: number;
  is_required: boolean;
}

export interface CustomFieldValue {
  field_definition: CustomFieldDefinition;
  value: string | null;
}

// ── Import / Export ───────────────────────────────────────────────────────────
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  format: string;
  tasks_created: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ── Two-factor authentication ─────────────────────────────────────────────────
export interface TwoFactorStatus {
  enabled: boolean;
  confirmed: boolean;
}

// ── GitHub integration ────────────────────────────────────────────────────────
export interface GitHubConnection {
  connected: boolean;
  github_username?: string;
  webhook_url?: string;
  webhook_secret?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  url: string;
  labels: { name: string; color: string }[];
}
