import type { AIExecutionConfig, ApprovedAIExecutionPlan } from '@/core/ai/types';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type DeadlineStatus = 'not_started' | 'in_progress' | 'review' | 'completed';

export type DeliverableType =
  | 'software'
  | 'prototype'
  | 'presentation'
  | 'assignment'
  | 'research_paper'
  | 'report'
  | 'video'
  | 'design'
  | 'other';

export type ExecutionApproach = 'output_only' | 'prototype_first' | 'guided_execution';

export type SubmissionFormat = 'url' | 'repository' | 'file_ref' | 'preview_embed' | 'document';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  headline?: string;
  role: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    emailAlerts: boolean;
    compactView: boolean;
    soundEnabled: boolean;
  };
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

export interface ReferenceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  deadlineId: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  targetDate?: string;
  order: number;
  isCriticalPath?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinalDeliverable {
  id: string;
  deadlineId: string;
  title: string;
  expectedOutput: string;
  summary: string;
  deliverableType: DeliverableType;
  submissionFormat: SubmissionFormat;
  resourceUri: string; // Repository link, live URL, cloud doc, or file path
  submittedAt: string;
  status: 'draft' | 'submitted' | 'accepted' | 'revision_requested';
  fileMetadata?: {
    filename?: string;
    filesize?: string;
    filetype?: string;
  };
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  deadlineId?: string;
  deadlineTitle?: string;
  type:
    | 'created'
    | 'updated'
    | 'milestone_completed'
    | 'progress_updated'
    | 'deliverable_submitted'
    | 'note_saved'
    | 'status_changed';
  title: string;
  description?: string;
  timestamp: string;
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  expectedOutput: string; // Plain language required output e.g. "A working calculator prototype"
  minimumAcceptableOutput?: string; // MVP / minimum deliverable specification
  priority: Priority;
  status: DeadlineStatus;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // HH:mm
  dueDateTime: string; // Combined ISO string
  progress: number; // 0 - 100
  deliverableType: DeliverableType;
  executionApproach?: ExecutionApproach; // Output Only, Prototype First, Guided Execution
  selectedPrototypeId?: string; // Optional identifier from prototype registry
  prototypeConfig?: Record<string, unknown>; // Optional prototype configuration
  referenceLinks: ReferenceLink[];
  attachments: Attachment[];
  milestones: Milestone[];
  finalDeliverable?: FinalDeliverable;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;

  // Phase 2 AI-Powered Execution Extensions:
  aiConfig?: AIExecutionConfig;
  approvedPlan?: ApprovedAIExecutionPlan;
  planHistory?: ApprovedAIExecutionPlan[];
}

export interface DeadlineFilter {
  searchQuery: string;
  status: 'all' | DeadlineStatus | 'overdue';
  priority: 'all' | Priority;
  type: 'all' | DeliverableType;
  sortBy: 'dueDateTime' | 'priority' | 'progress' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface DashboardStats {
  total: number;
  active: number;
  dueToday: number;
  dueTomorrow: number;
  completed: number;
  overdue: number;
  deliveryRate: number; // %
}

// Re-export AI Integration domain types
export * from '@/core/ai/types';

// Re-export Universal IDE Integration domain types
export * from '@/core/ide/types';

