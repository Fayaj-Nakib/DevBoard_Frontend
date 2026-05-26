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
