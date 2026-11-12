import { create } from 'zustand';
import {
  Deadline,
  Activity,
  User,
  DeadlineFilter,
  DashboardStats,
  FinalDeliverable,
  ReferenceLink,
  Milestone,
  AIProviderId,
  AIProviderConfig,
  AIConnectionTestResult,
  AIExecutionPlan,
  AIModelMetadata,
  ModelDiscoveryResult,
  ModelDiscoveryStatus,
  ApprovedAIExecutionPlan,
  IDEProviderId,
  IDEDetectionResult,
  IDECapabilities,
  ExecutionSession,
  WorkspaceChangesResult,
  ProjectConfiguration,
  EnvironmentVerificationReport,
  HostRuntimes,
  ProjectInspectionResult,
  InitializationProgressEvent,
} from '@/types';
import { storageService } from '@/services/storage';
import { executionEngine } from '@/core/execution';
import { aiExecutionService } from '@/core/ai/AIExecutionService';
import { modelDiscoveryService } from '@/core/ai/ModelDiscoveryService';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { maskApiKey } from '@/core/security/ICredentialStorage';
import { isDueToday, isDueTomorrow, createIsoFromLocal } from '@/lib/utils';
import { playMilestoneChime, playDeliverableChime } from '@/lib/audio';
import { ideDiscoveryService } from '@/core/ide/IDEDiscoveryService';
import { ideExecutionService } from '@/core/ide/IDEExecutionService';
import { localBridgeClient } from '@/core/ide/bridge/LocalBridgeClient';
import { ideProviderRegistry } from '@/core/ide/IDEProviderRegistry';
import { projectInitializationService } from '@/core/project/ProjectInitializationService';

export type NavigationTab =
  | 'overview'
  | 'my-deadlines'
  | 'upcoming'
  | 'in-progress'
  | 'completed'
  | 'deliverables'
  | 'analytics'
  | 'settings';

interface DeadlineStoreState {
  // Navigation & UI state
  activeTab: NavigationTab;
  selectedDeadlineId: string | null;
  isCreateModalOpen: boolean;
  editingDeadline: Deadline | null;
  searchQuery: string;

  // Data
  deadlines: Deadline[];
  activities: Activity[];
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // AI Integration State (Session & Metadata)
  configuredProviders: Record<string, AIProviderConfig>;
  discoveredModels: Record<string, AIModelMetadata[]>;
  modelDiscoveryStatus: Record<string, { status: ModelDiscoveryStatus; error?: string; discoveredAt?: string }>;
  isDiscoveringModels: Record<string, boolean>;
  activeExecutionPlans: Record<string, AIExecutionPlan>;
  isTestingProvider: boolean;
  isGeneratingPlan: boolean;

  // Filter
  filter: DeadlineFilter;

  // Computed / Getters
  stats: () => DashboardStats;
  selectedDeadline: () => Deadline | null;

  // Actions - Navigation
  setActiveTab: (tab: NavigationTab) => void;
  selectDeadline: (id: string | null) => void;
  openCreateModal: (editing?: Deadline | null) => void;
  closeCreateModal: () => void;
  setSearchQuery: (query: string) => void;

  // Actions - AI Integrations
  saveProviderConfig: (config: Omit<AIProviderConfig, 'createdAt' | 'updatedAt'>, apiKey?: string) => Promise<void>;
  removeProviderConfig: (providerId: AIProviderId) => Promise<void>;
  testProviderConnection: (providerId: AIProviderId, apiKey?: string, baseUrl?: string, modelId?: string) => Promise<AIConnectionTestResult>;
  discoverProviderModels: (providerId: AIProviderId, apiKey?: string, baseUrl?: string) => Promise<ModelDiscoveryResult>;
  setProviderApiKey: (providerId: AIProviderId, apiKey: string) => Promise<void>;
  getMaskedApiKey: (providerId: AIProviderId) => Promise<string>;
  hasProviderApiKey: (providerId: AIProviderId) => Promise<boolean>;
  generateExecutionPlan: (deadlineId: string, customInstructions?: string, preferredProviderId?: AIProviderId) => Promise<AIExecutionPlan>;
  saveApprovedPlan: (deadlineId: string, plan: ApprovedAIExecutionPlan) => Promise<void>;
  updateApprovedPlan: (deadlineId: string, updates: Partial<ApprovedAIExecutionPlan>) => Promise<void>;
  importPlanMilestones: (deadlineId: string, selectedMilestoneIndices?: number[]) => Promise<{ importedCount: number }>;
  regenerateDeadlinePlan: (
    deadlineId: string,
    providerId: AIProviderId,
    modelId?: string,
    customInstructions?: string
  ) => Promise<AIExecutionPlan>;
  removeApprovedPlan: (deadlineId: string) => Promise<void>;

  // Actions - Data Operations
  loadInitialData: () => Promise<void>;
  createDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deadline>;
  updateDeadline: (id: string, updates: Partial<Deadline>) => Promise<Deadline>;
  deleteDeadline: (id: string) => Promise<void>;

  // Actions - Workspace Execution Operations
  toggleMilestone: (deadlineId: string, milestoneId: string) => Promise<void>;
  addMilestone: (deadlineId: string, title: string, targetDate?: string) => Promise<void>;
  deleteMilestone: (deadlineId: string, milestoneId: string) => Promise<void>;
  reorderMilestone: (deadlineId: string, milestoneId: string, direction: 'up' | 'down') => Promise<void>;
  updateProgress: (deadlineId: string, progress: number) => Promise<void>;
  updateNotes: (deadlineId: string, notes: string) => Promise<void>;
  addReferenceLink: (deadlineId: string, link: Omit<ReferenceLink, 'id' | 'createdAt'>) => Promise<void>;
  removeReferenceLink: (deadlineId: string, linkId: string) => Promise<void>;
  submitFinalDeliverable: (
    deadlineId: string,
    deliverable: Omit<FinalDeliverable, 'id' | 'deadlineId' | 'submittedAt' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  reopenDeadline: (deadlineId: string) => Promise<void>;

  // Actions - Filter & User
  setFilter: (updates: Partial<DeadlineFilter>) => void;
  resetFilter: () => void;
  updateUserPreferences: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  resetToSampleData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<boolean>;

  // Phase 3 Universal IDE Integration State
  bridgeStatus: 'connected' | 'disconnected' | 'connecting' | 'unauthorized';
  bridgePort: number;
  pairingToken: string | null;
  detectedIDEs: Record<IDEProviderId, IDEDetectionResult>;
  ideCapabilities: Record<IDEProviderId, IDECapabilities>;
  isDetectingIDEs: boolean;
  selectedIDEProviderId: IDEProviderId;
  selectedProjectPath: string;
  activeExecutionSessions: Record<string, ExecutionSession>;
  isStartingIDESession: boolean;
  ideSessionError: string | null;
  workspaceChanges: Record<string, WorkspaceChangesResult>;
  isInspectingWorkspaceChanges: boolean;

  // Phase 3 Universal IDE Integration Actions
  checkBridgeConnection: (token?: string) => Promise<boolean>;
  pairBridge: (token: string, port?: number) => Promise<boolean>;
  disconnectBridge: () => void;
  detectInstalledIDEs: () => Promise<Record<IDEProviderId, IDEDetectionResult>>;
  setSelectedIDEProvider: (providerId: IDEProviderId) => void;
  setSelectedProjectPath: (path: string) => void;
  startIDESession: (deadlineId: string, userInstructions?: string) => Promise<ExecutionSession>;
  refreshIDESessionStatus: (deadlineId: string) => Promise<ExecutionSession | null>;
  stopIDESession: (deadlineId: string) => Promise<boolean>;
  inspectWorkspaceChanges: (deadlineId: string) => Promise<WorkspaceChangesResult>;

  // Phase 4 Project Initialization & Environment Setup State
  hostRuntimes: HostRuntimes | null;
  projectConfigurations: Record<string, ProjectConfiguration>;
  environmentReports: Record<string, EnvironmentVerificationReport>;
  isPickingFolder: boolean;
  isInitializingProject: boolean;
  initializationProgressEvents: Record<string, InitializationProgressEvent[]>;
  isPrepareProjectModalOpen: boolean;

  // Phase 4 Project Initialization Actions
  openPrepareProjectModal: () => void;
  closePrepareProjectModal: () => void;
  fetchHostRuntimes: () => Promise<HostRuntimes>;
  pickNativeFolder: (prompt?: string, startingDir?: string) => Promise<{ success: boolean; path?: string; isGitRepo?: boolean; cancelled?: boolean; error?: string }>;
  inspectProjectDirectory: (path: string) => Promise<ProjectInspectionResult>;
  saveProjectConfiguration: (deadlineId: string, config: ProjectConfiguration) => void;
  initializeProjectEnvironment: (deadlineId: string, config: ProjectConfiguration) => Promise<EnvironmentVerificationReport>;
  verifyProjectEnvironment: (deadlineId: string, path?: string) => Promise<EnvironmentVerificationReport>;
}

const defaultFilter: DeadlineFilter = {
  searchQuery: '',
  status: 'all',
  priority: 'all',
  type: 'all',
  sortBy: 'dueDateTime',
  sortOrder: 'asc',
};

export const useDeadlineStore = create<DeadlineStoreState>((set, get) => ({
  activeTab: 'overview',
  selectedDeadlineId: null,
  isCreateModalOpen: false,
  editingDeadline: null,
  searchQuery: '',

  deadlines: [],
  activities: [],
  user: null,
  isLoading: true,
  error: null,

  configuredProviders: {},
  discoveredModels: {},
  modelDiscoveryStatus: {},
  isDiscoveringModels: {},
  activeExecutionPlans: {},
  isTestingProvider: false,
  isGeneratingPlan: false,

  // Phase 3 Universal IDE Integration Initial State
  bridgeStatus: 'disconnected',
  bridgePort: 4488,
  pairingToken:
    typeof window !== 'undefined'
      ? localStorage.getItem('deadline_bridge_token') || '00e901de26fe44ca7874cedcf4a9433a6b805b06f593c03fdcc26b54ec43bb77'
      : null,
  detectedIDEs: {},
  ideCapabilities: {},
  isDetectingIDEs: false,
  selectedIDEProviderId: 'claude_code',
  selectedProjectPath: '/Users/apple/Desktop/Project- Deadline ',
  activeExecutionSessions: {},
  isStartingIDESession: false,
  ideSessionError: null,
  workspaceChanges: {},
  isInspectingWorkspaceChanges: false,

  // Phase 4 Project Initialization Initial State
  hostRuntimes: null,
  projectConfigurations: {},
  environmentReports: {},
  isPickingFolder: false,
  isInitializingProject: false,
  initializationProgressEvents: {},
  isPrepareProjectModalOpen: false,

  filter: defaultFilter,

  stats: () => {
    const { deadlines } = get();
    const now = new Date();

    const total = deadlines.length;
    let active = 0;
    let dueToday = 0;
    let dueTomorrow = 0;
    let completed = 0;
    let overdue = 0;

    for (const d of deadlines) {
      const isDone = d.status === 'completed';
      const isPast = new Date(d.dueDateTime).getTime() < now.getTime();

      if (isDone) {
        completed++;
      } else {
        active++;
        if (isPast) {
          overdue++;
        }
      }

      if (!isDone && isDueToday(d.dueDateTime, now)) {
        dueToday++;
      }
      if (!isDone && isDueTomorrow(d.dueDateTime, now)) {
        dueTomorrow++;
      }
    }

    const deliveryRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      active,
      dueToday,
      dueTomorrow,
      completed,
      overdue,
      deliveryRate,
    };
  },

  selectedDeadline: () => {
    const { deadlines, selectedDeadlineId } = get();
    if (!selectedDeadlineId) return null;
    return deadlines.find((d) => d.id === selectedDeadlineId) || null;
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab, selectedDeadlineId: null });
  },

  selectDeadline: (id) => {
    set({ selectedDeadlineId: id });
  },

  openCreateModal: (editing = null) => {
    set({ isCreateModalOpen: true, editingDeadline: editing });
  },

  closeCreateModal: () => {
    set({ isCreateModalOpen: false, editingDeadline: null });
  },

  setSearchQuery: (query) => {
    set((state) => ({
      searchQuery: query,
      filter: { ...state.filter, searchQuery: query },
    }));
  },

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [deadlines, activities, user] = await Promise.all([
        storageService.getDeadlines(),
        storageService.getActivities(),
        storageService.getUser(),
      ]);

      let parsedProviders: Record<string, AIProviderConfig> = {};
      try {
        const rawProviders = localStorage.getItem('deadline_app_ai_providers_v1');
        if (rawProviders) {
          parsedProviders = JSON.parse(rawProviders);
        }
      } catch {
        // Ignore JSON error
      }

      let parsedDiscoveredModels: Record<string, AIModelMetadata[]> = {};
      try {
        const rawModels = localStorage.getItem('deadline_app_discovered_models_v1');
        if (rawModels) {
          parsedDiscoveredModels = JSON.parse(rawModels);
        }
      } catch {
        // Ignore JSON error
      }

      let parsedSessions: Record<string, ExecutionSession> = {};
      try {
        const rawSessions = localStorage.getItem('deadline_ide_sessions_v1');
        if (rawSessions) {
          parsedSessions = JSON.parse(rawSessions);
        }
      } catch {
        // Ignore JSON error
      }

      let parsedProjectConfigs: Record<string, ProjectConfiguration> = {};
      try {
        const rawConfigs = localStorage.getItem('deadline_project_configs_v1');
        if (rawConfigs) parsedProjectConfigs = JSON.parse(rawConfigs);
      } catch {
        // Ignore
      }

      let parsedEnvReports: Record<string, EnvironmentVerificationReport> = {};
      try {
        const rawReports = localStorage.getItem('deadline_env_reports_v1');
        if (rawReports) parsedEnvReports = JSON.parse(rawReports);
      } catch {
        // Ignore
      }

      set({
        deadlines,
        activities,
        user,
        configuredProviders: parsedProviders,
        discoveredModels: parsedDiscoveredModels,
        activeExecutionSessions: parsedSessions,
        projectConfigurations: parsedProjectConfigs,
        environmentReports: parsedEnvReports,
        isLoading: false,
      });

      // Silently check and connect to Deadline Local Bridge if available
      try {
        get().checkBridgeConnection();
      } catch {
        // Ignore bridge startup error
      }
    } catch (e) {
      console.error('Error loading initial data', e);
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createDeadline: async (deadlineData) => {
    const nowIso = new Date().toISOString();
    const newId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dueDateTime = createIsoFromLocal(deadlineData.deadlineDate, deadlineData.deadlineTime);

    const newDeadline: Deadline = {
      ...deadlineData,
      id: newId,
      dueDateTime,
      progress: deadlineData.progress ?? 0,
      milestones: deadlineData.milestones || [],
      referenceLinks: deadlineData.referenceLinks || [],
      attachments: deadlineData.attachments || [],
      tags: deadlineData.tags || [],
      notes: deadlineData.notes || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const saved = await storageService.saveDeadline(newDeadline);

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId: saved.id,
      deadlineTitle: saved.title,
      type: 'created',
      title: `Created deadline: "${saved.title}"`,
      description: `Target: ${saved.expectedOutput} (Due: ${saved.deadlineDate})`,
      timestamp: nowIso,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({
      deadlines: updatedDeadlines,
      activities: updatedActivities,
      isCreateModalOpen: false,
      editingDeadline: null,
    });

    return saved;
  },

  updateDeadline: async (id, updates) => {
    const target = get().deadlines.find((d) => d.id === id);
    if (!target) throw new Error('Deadline not found');

    let updatedDueDateTime = target.dueDateTime;
    if (updates.deadlineDate || updates.deadlineTime) {
      const date = updates.deadlineDate || target.deadlineDate;
      const time = updates.deadlineTime || target.deadlineTime;
      updatedDueDateTime = createIsoFromLocal(date, time);
    }

    const payload = {
      ...updates,
      dueDateTime: updatedDueDateTime,
    };

    const updated = await storageService.updateDeadline(id, payload);

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId: id,
      deadlineTitle: updated.title,
      type: 'updated',
      title: `Updated deadline details for "${updated.title}"`,
      timestamp: new Date().toISOString(),
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({
      deadlines: updatedDeadlines,
      activities: updatedActivities,
      isCreateModalOpen: false,
      editingDeadline: null,
    });

    return updated;
  },

  deleteDeadline: async (id) => {
    const target = get().deadlines.find((d) => d.id === id);
    await storageService.deleteDeadline(id);

    if (target) {
      await storageService.addActivity({
        id: `act_${Date.now()}`,
        type: 'status_changed',
        title: `Deleted deadline "${target.title}"`,
        timestamp: new Date().toISOString(),
      });
    }

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({
      deadlines: updatedDeadlines,
      activities: updatedActivities,
      selectedDeadlineId: get().selectedDeadlineId === id ? null : get().selectedDeadlineId,
    });
  },

  toggleMilestone: async (deadlineId, milestoneId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    let toggledMilestoneTitle = '';
    let becameCompleted = false;

    const updatedMilestones = target.milestones.map((m) => {
      if (m.id === milestoneId) {
        toggledMilestoneTitle = m.title;
        becameCompleted = !m.isCompleted;
        return {
          ...m,
          isCompleted: !m.isCompleted,
          completedAt: !m.isCompleted ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    const calculatedProgress = executionEngine.calculateProgress(updatedMilestones);

    await storageService.updateDeadline(deadlineId, {
      milestones: updatedMilestones,
      progress: calculatedProgress,
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'milestone_completed',
      title: becameCompleted
        ? `Completed milestone: "${toggledMilestoneTitle}"`
        : `Marked milestone uncompleted: "${toggledMilestoneTitle}"`,
      description: `Progress updated to ${calculatedProgress}% on "${target.title}"`,
      timestamp: new Date().toISOString(),
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    if (becameCompleted && get().user?.preferences?.soundEnabled !== false) {
      playMilestoneChime();
    }

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  addMilestone: async (deadlineId, title, targetDate) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const newMilestone: Milestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      deadlineId,
      title: title.trim(),
      isCompleted: false,
      order: target.milestones.length + 1,
      targetDate: targetDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedMilestones = [...target.milestones, newMilestone];
    const calculatedProgress = executionEngine.calculateProgress(updatedMilestones);

    await storageService.updateDeadline(deadlineId, {
      milestones: updatedMilestones,
      progress: calculatedProgress,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  deleteMilestone: async (deadlineId, milestoneId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const updatedMilestones = target.milestones.filter((m) => m.id !== milestoneId);
    const calculatedProgress = executionEngine.calculateProgress(updatedMilestones);

    await storageService.updateDeadline(deadlineId, {
      milestones: updatedMilestones,
      progress: calculatedProgress,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  reorderMilestone: async (deadlineId, milestoneId, direction) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const list = [...target.milestones].sort((a, b) => a.order - b.order);
    const index = list.findIndex((m) => m.id === milestoneId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = list[index - 1];
      const curr = list[index];
      const tempOrder = prev.order;
      prev.order = curr.order;
      curr.order = tempOrder;
    } else if (direction === 'down' && index < list.length - 1) {
      const next = list[index + 1];
      const curr = list[index];
      const tempOrder = next.order;
      next.order = curr.order;
      curr.order = tempOrder;
    } else {
      return;
    }

    list.sort((a, b) => a.order - b.order);
    await storageService.updateDeadline(deadlineId, { milestones: list });
    const updatedDeadlines = await storageService.getDeadlines();
    set({ deadlines: updatedDeadlines });
  },

  updateProgress: async (deadlineId, progress) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const clamped = Math.max(0, Math.min(100, progress));
    const newStatus = clamped === 100 ? (target.finalDeliverable ? 'completed' : 'review') : 'in_progress';

    await storageService.updateDeadline(deadlineId, {
      progress: clamped,
      status: target.status === 'completed' && clamped < 100 ? 'in_progress' : newStatus,
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'progress_updated',
      title: `Progress updated to ${clamped}% for "${target.title}"`,
      timestamp: new Date().toISOString(),
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  updateNotes: async (deadlineId, notes) => {
    await storageService.updateDeadline(deadlineId, { notes });
    const updatedDeadlines = await storageService.getDeadlines();
    set({ deadlines: updatedDeadlines });
  },

  addReferenceLink: async (deadlineId, link) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const newLink: ReferenceLink = {
      ...link,
      id: `ref_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedLinks = [...target.referenceLinks, newLink];
    await storageService.updateDeadline(deadlineId, { referenceLinks: updatedLinks });

    const updatedDeadlines = await storageService.getDeadlines();
    set({ deadlines: updatedDeadlines });
  },

  removeReferenceLink: async (deadlineId, linkId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const updatedLinks = target.referenceLinks.filter((l) => l.id !== linkId);
    await storageService.updateDeadline(deadlineId, { referenceLinks: updatedLinks });

    const updatedDeadlines = await storageService.getDeadlines();
    set({ deadlines: updatedDeadlines });
  },

  submitFinalDeliverable: async (deadlineId, deliverableData) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const nowIso = new Date().toISOString();
    const finalDeliv: FinalDeliverable = {
      ...deliverableData,
      id: `deliv_${Date.now()}`,
      deadlineId,
      submittedAt: nowIso,
      status: 'submitted',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Mark deadline as completed and 100% progress
    await storageService.updateDeadline(deadlineId, {
      status: 'completed',
      progress: 100,
      finalDeliverable: finalDeliv,
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'deliverable_submitted',
      title: `Submitted final deliverable for "${target.title}"`,
      description: `Deliverable: "${finalDeliv.title}" via ${finalDeliv.submissionFormat} (${finalDeliv.resourceUri})`,
      timestamp: nowIso,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    if (get().user?.preferences?.soundEnabled !== false) {
      playDeliverableChime();
    }

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  reopenDeadline: async (deadlineId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    await storageService.updateDeadline(deadlineId, {
      status: 'in_progress',
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'status_changed',
      title: `Reopened deadline "${target.title}" for active execution`,
      timestamp: new Date().toISOString(),
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  setFilter: (updates) => {
    set((state) => ({ filter: { ...state.filter, ...updates } }));
  },

  resetFilter: () => {
    set({ filter: defaultFilter, searchQuery: '' });
  },

  updateUserPreferences: async (theme) => {
    const updatedUser = await storageService.updateUser({
      preferences: {
        theme,
        emailAlerts: true,
        compactView: false,
        soundEnabled: true,
      },
    });

    // Update document root class
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    set({ user: updatedUser });
  },

  resetToSampleData: async () => {
    await storageService.resetToSampleData();
    const [deadlines, activities, user] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
      storageService.getUser(),
    ]);
    set({ deadlines, activities, user, selectedDeadlineId: null });
  },

  exportData: async () => {
    return await storageService.exportAllData();
  },

  importData: async (json) => {
    const ok = await storageService.importData(json);
    if (ok) {
      const [deadlines, activities, user] = await Promise.all([
        storageService.getDeadlines(),
        storageService.getActivities(),
        storageService.getUser(),
      ]);
      set({ deadlines, activities, user, selectedDeadlineId: null });
    }
    return ok;
  },

  saveProviderConfig: async (config, apiKey) => {
    const nowIso = new Date().toISOString();
    const updatedConfig: AIProviderConfig = {
      ...config,
      createdAt: get().configuredProviders[config.providerId]?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (apiKey && apiKey.trim()) {
      await credentialStorage.saveSecret(`ai_key_${config.providerId}`, apiKey.trim());
    }

    const updated = {
      ...get().configuredProviders,
      [config.providerId]: updatedConfig,
    };

    set({ configuredProviders: updated });
    try {
      localStorage.setItem('deadline_app_ai_providers_v1', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  },

  removeProviderConfig: async (providerId) => {
    await credentialStorage.clearSecret(`ai_key_${providerId}`);
    const next = { ...get().configuredProviders };
    delete next[providerId];
    set({ configuredProviders: next });
    try {
      localStorage.setItem('deadline_app_ai_providers_v1', JSON.stringify(next));
    } catch {
      // Ignore
    }
  },

  testProviderConnection: async (providerId, apiKey, baseUrl, modelId) => {
    set({ isTestingProvider: true });
    try {
      let keyToTest = apiKey;
      if (!keyToTest) {
        const stored = await credentialStorage.getSecret(`ai_key_${providerId}`);
        if (stored) keyToTest = stored;
      }

      const res = await aiExecutionService.testConnection(
        providerId,
        keyToTest || '',
        baseUrl,
        modelId
      );

      // If we have an existing config, update its test status
      const existing = get().configuredProviders[providerId];
      if (existing) {
        const updated: AIProviderConfig = {
          ...existing,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: res.success ? 'success' : 'failed',
          lastTestError: res.success ? undefined : res.message,
          updatedAt: new Date().toISOString(),
        };
        const updatedMap = { ...get().configuredProviders, [providerId]: updated };
        set({ configuredProviders: updatedMap });
        try {
          localStorage.setItem('deadline_app_ai_providers_v1', JSON.stringify(updatedMap));
        } catch {
          // Ignore
        }
      }

      set({ isTestingProvider: false });
      return res;
    } catch (e) {
      set({ isTestingProvider: false });
      return {
        success: false,
        message: (e as Error).message || 'Connection test failed unexpectedly.',
      };
    }
  },

  discoverProviderModels: async (providerId, apiKey, baseUrl) => {
    set((s) => ({
      isDiscoveringModels: { ...s.isDiscoveringModels, [providerId]: true },
    }));

    try {
      let keyToUse = apiKey;
      if (!keyToUse) {
        const stored = await credentialStorage.getSecret(`ai_key_${providerId}`);
        if (stored) keyToUse = stored;
      }

      const res = await modelDiscoveryService.discoverModels(
        providerId,
        keyToUse || '',
        baseUrl
      );

      set((s) => {
        const newDiscovered = { ...s.discoveredModels };
        if (res.success && res.models.length > 0) {
          newDiscovered[providerId] = res.models;
        }

        const newStatuses = {
          ...s.modelDiscoveryStatus,
          [providerId]: {
            status: res.status,
            error: res.errorMessage || res.rawError,
            discoveredAt: res.discoveredAt,
          },
        };

        let updatedConfigs = s.configuredProviders;
        const currentCfg = s.configuredProviders[providerId];
        if (currentCfg && res.models.length > 0) {
          const modelExists = res.models.some(
            (m) => m.id.toLowerCase() === (currentCfg.selectedModelId || '').toLowerCase()
          );
          if (!modelExists || !currentCfg.selectedModelId) {
            const defaultModel =
              res.models.find((m) => m.id.includes('2.0-flash')) || res.models[0];
            updatedConfigs = {
              ...s.configuredProviders,
              [providerId]: {
                ...currentCfg,
                selectedModelId: defaultModel.id,
                updatedAt: new Date().toISOString(),
              },
            };
          }
        }

        return {
          discoveredModels: newDiscovered,
          modelDiscoveryStatus: newStatuses,
          configuredProviders: updatedConfigs,
          isDiscoveringModels: { ...s.isDiscoveringModels, [providerId]: false },
        };
      });

      if (res.success && res.models.length > 0) {
        try {
          const currentMap = get().discoveredModels;
          localStorage.setItem(
            'deadline_app_discovered_models_v1',
            JSON.stringify(currentMap)
          );
        } catch {
          // Ignore
        }
      }

      return res;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const failResult: ModelDiscoveryResult = {
        success: false,
        models: [],
        provider: providerId,
        discoveredAt: new Date().toISOString(),
        status: 'network_error',
        errorMessage: errMsg,
      };

      set((s) => ({
        modelDiscoveryStatus: {
          ...s.modelDiscoveryStatus,
          [providerId]: {
            status: 'network_error',
            error: errMsg,
            discoveredAt: failResult.discoveredAt,
          },
        },
        isDiscoveringModels: { ...s.isDiscoveringModels, [providerId]: false },
      }));

      return failResult;
    }
  },

  setProviderApiKey: async (providerId, apiKey) => {
    await credentialStorage.saveSecret(`ai_key_${providerId}`, apiKey);
  },

  getMaskedApiKey: async (providerId) => {
    const key = await credentialStorage.getSecret(`ai_key_${providerId}`);
    return key ? maskApiKey(key) : '';
  },

  hasProviderApiKey: async (providerId) => {
    return await credentialStorage.hasSecret(`ai_key_${providerId}`);
  },

  generateExecutionPlan: async (deadlineId, customInstructions, preferredProviderId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) {
      throw new Error(`Deadline "${deadlineId}" not found.`);
    }

    set({ isGeneratingPlan: true });
    try {
      const providers = get().configuredProviders;
      let effectiveProviderId: AIProviderId = preferredProviderId || 'gemini';
      if (!preferredProviderId) {
        const enabledKeys = Object.keys(providers).filter((k) => providers[k]?.isEnabled) as AIProviderId[];
        if (enabledKeys.length > 0) {
          effectiveProviderId = enabledKeys.includes('gemini') ? 'gemini' : enabledKeys[0];
        }
      }
      const config = providers[effectiveProviderId];

      // 1. Confirm key in memory
      const hasKey = await credentialStorage.hasSecret(`ai_key_${effectiveProviderId}`);
      if (!hasKey) {
        throw new Error(
          `No API key found in active memory for ${effectiveProviderId}. Please enter your API key in Settings > AI Integrations.`
        );
      }

      // 2. Confirm selected model exists in discovered list if discovered list is available
      const discoveredForProvider = get().discoveredModels[effectiveProviderId];
      const selectedModel = config?.selectedModelId;
      if (discoveredForProvider && discoveredForProvider.length > 0 && selectedModel) {
        const exists = discoveredForProvider.some(
          (m) => m.id.toLowerCase() === selectedModel.toLowerCase() && m.isAvailable
        );
        if (!exists) {
          throw new Error('The selected model is no longer available for this API key. Refresh models and select another model.');
        }
      }

      const plan = await aiExecutionService.generateExecutionPlan(
        target,
        effectiveProviderId,
        undefined,
        config?.baseUrl,
        config?.selectedModelId,
        customInstructions
      );

      set((state) => ({
        activeExecutionPlans: {
          ...state.activeExecutionPlans,
          [deadlineId]: plan,
        },
        isGeneratingPlan: false,
      }));

      // Record activity
      await storageService.addActivity({
        id: `act_${Date.now()}`,
        deadlineId,
        deadlineTitle: target.title,
        type: 'updated',
        title: `Generated AI execution plan for "${target.title}" using ${effectiveProviderId}`,
        timestamp: new Date().toISOString(),
      });

      return plan;
    } catch (e) {
      set({ isGeneratingPlan: false });
      throw e;
    }
  },

  saveApprovedPlan: async (deadlineId, plan) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    const currentApproved = target.approvedPlan;
    const history = target.planHistory ? [...target.planHistory] : [];
    if (currentApproved) {
      history.push(currentApproved);
    }

    const version = (currentApproved?.version || 0) + 1;
    const nowIso = new Date().toISOString();

    const finalizedPlan: ApprovedAIExecutionPlan = {
      ...plan,
      deadlineId,
      version,
      approvalStatus: 'approved',
      approvedAt: nowIso,
    };

    await storageService.updateDeadline(deadlineId, {
      approvedPlan: finalizedPlan,
      planHistory: history,
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'updated',
      title: `Approved AI execution plan v${version} for "${target.title}"`,
      description: `Provider: ${plan.providerId} (${plan.modelId})`,
      timestamp: nowIso,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  updateApprovedPlan: async (deadlineId, updates) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target || !target.approvedPlan) return;

    const updatedPlan: ApprovedAIExecutionPlan = {
      ...target.approvedPlan,
      ...updates,
      isEditedByUser: true,
    };

    await storageService.updateDeadline(deadlineId, {
      approvedPlan: updatedPlan,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  importPlanMilestones: async (deadlineId, selectedMilestoneIndices) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target || !target.approvedPlan?.suggestedMilestones) {
      return { importedCount: 0 };
    }

    const allPlanMilestones = target.approvedPlan.suggestedMilestones;
    const candidates = selectedMilestoneIndices
      ? allPlanMilestones.filter((_, idx) => selectedMilestoneIndices.includes(idx))
      : allPlanMilestones;

    // Prevent duplicate imports: match against existing milestones by trimmed lowercase title
    const existingTitles = new Set(target.milestones.map((m) => m.title.trim().toLowerCase()));
    const toImport = candidates.filter((m) => !existingTitles.has(m.title.trim().toLowerCase()));

    if (toImport.length === 0) {
      return { importedCount: 0 };
    }

    const nowIso = new Date().toISOString();
    const newMilestones: Milestone[] = toImport.map((m, idx) => ({
      id: `ms_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      deadlineId,
      title: m.title.trim(),
      description: m.description ? m.description.trim() : undefined,
      isCompleted: false,
      order: target.milestones.length + idx + 1,
      isCriticalPath: Boolean(m.isCriticalPath),
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const combinedMilestones = [...target.milestones, ...newMilestones];
    const calculatedProgress = executionEngine.calculateProgress(combinedMilestones);

    // Mark imported milestones in approvedPlan
    const updatedPlanMilestones = target.approvedPlan.suggestedMilestones.map((pm) => {
      if (toImport.some((imp) => imp.title.trim().toLowerCase() === pm.title.trim().toLowerCase())) {
        return { ...pm, isImported: true };
      }
      return pm;
    });

    await storageService.updateDeadline(deadlineId, {
      milestones: combinedMilestones,
      progress: calculatedProgress,
      approvedPlan: {
        ...target.approvedPlan,
        suggestedMilestones: updatedPlanMilestones,
      },
    });

    await storageService.addActivity({
      id: `act_${Date.now()}`,
      deadlineId,
      deadlineTitle: target.title,
      type: 'updated',
      title: `Imported ${newMilestones.length} milestone(s) from AI execution plan into "${target.title}"`,
      timestamp: nowIso,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
    return { importedCount: newMilestones.length };
  },

  regenerateDeadlinePlan: async (deadlineId, providerId, modelId, customInstructions) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) {
      throw new Error(`Deadline "${deadlineId}" not found.`);
    }

    const config = get().configuredProviders[providerId];
    const effectiveModel = modelId || config?.selectedModelId;

    const plan = await aiExecutionService.generateExecutionPlan(
      target,
      providerId,
      undefined,
      config?.baseUrl,
      effectiveModel,
      customInstructions
    );

    set((state) => ({
      activeExecutionPlans: {
        ...state.activeExecutionPlans,
        [deadlineId]: plan,
      },
    }));

    return plan;
  },

  removeApprovedPlan: async (deadlineId) => {
    const target = get().deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    await storageService.updateDeadline(deadlineId, {
      approvedPlan: undefined,
    });

    const [updatedDeadlines, updatedActivities] = await Promise.all([
      storageService.getDeadlines(),
      storageService.getActivities(),
    ]);

    set({ deadlines: updatedDeadlines, activities: updatedActivities });
  },

  // ==========================================
  // PHASE 3 UNIVERSAL IDE INTEGRATION ACTIONS
  // ==========================================

  checkBridgeConnection: async (tokenOverride?: string) => {
    const port = get().bridgePort;
    const token =
      tokenOverride ||
      get().pairingToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('deadline_bridge_token') ||
          '00e901de26fe44ca7874cedcf4a9433a6b805b06f593c03fdcc26b54ec43bb77'
        : '00e901de26fe44ca7874cedcf4a9433a6b805b06f593c03fdcc26b54ec43bb77');

    localBridgeClient.setPort(port);
    localBridgeClient.setPairingToken(token);

    set({ bridgeStatus: 'connecting' });
    const isReachable = await localBridgeClient.isBridgeReachable();
    if (!isReachable) {
      set({ bridgeStatus: 'disconnected' });
      return false;
    }

    // Attempt pairing
    const isPaired = await localBridgeClient.pair(token);
    if (!isPaired) {
      set({ bridgeStatus: 'unauthorized' });
      return false;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('deadline_bridge_token', token);
      } catch {
        // Ignore
      }
    }

    set({ bridgeStatus: 'connected', pairingToken: token });

    // Automatically trigger IDE detection across all 6 providers
    await get().detectInstalledIDEs();
    return true;
  },

  pairBridge: async (token: string, port = 4488) => {
    set({ bridgePort: port, pairingToken: token.trim() });
    return await get().checkBridgeConnection(token.trim());
  },

  disconnectBridge: () => {
    localBridgeClient.setPairingToken(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('deadline_bridge_token');
      } catch {
        // Ignore
      }
    }
    set({
      bridgeStatus: 'disconnected',
      pairingToken: null,
      detectedIDEs: {},
      ideCapabilities: {},
    });
  },

  detectInstalledIDEs: async () => {
    set({ isDetectingIDEs: true });
    try {
      const allInfo = await ideDiscoveryService.discoverAll();
      const detectedMap: Record<IDEProviderId, IDEDetectionResult> = {};
      const capMap: Record<IDEProviderId, IDECapabilities> = {};

      for (const [id, info] of Object.entries(allInfo)) {
        detectedMap[id] = info.detection;
        capMap[id] = info.capabilities;
      }

      // If current selected provider is not installed, select first detected installed provider
      let currentSelection = get().selectedIDEProviderId;
      const installedProviders = Object.keys(detectedMap).filter(
        (id) => detectedMap[id]?.isInstalled
      );

      if (!detectedMap[currentSelection]?.isInstalled && installedProviders.length > 0) {
        currentSelection = installedProviders[0];
      }

      set({
        detectedIDEs: detectedMap,
        ideCapabilities: capMap,
        selectedIDEProviderId: currentSelection,
        isDetectingIDEs: false,
      });

      return detectedMap;
    } catch (e) {
      console.error('Failed to detect IDEs', e);
      set({ isDetectingIDEs: false });
      return {};
    }
  },

  setSelectedIDEProvider: (providerId: IDEProviderId) => {
    set({ selectedIDEProviderId: providerId });
  },

  setSelectedProjectPath: (path: string) => {
    set({ selectedProjectPath: path });
  },

  startIDESession: async (deadlineId: string, userInstructions?: string) => {
    const deadline = get().deadlines.find((d) => d.id === deadlineId);
    if (!deadline) {
      throw new Error(`Deadline "${deadlineId}" not found.`);
    }

    const providerId = get().selectedIDEProviderId;
    const projectPath = get().selectedProjectPath;
    const projectConfig = get().projectConfigurations[deadlineId];
    const envReport = get().environmentReports[deadlineId];

    set({ isStartingIDESession: true, ideSessionError: null });

    try {
      const { session, launchResult } = await ideExecutionService.startExecution(
        deadline,
        providerId,
        projectPath,
        userInstructions,
        projectConfig,
        envReport
      );

      const updatedSessions = {
        ...get().activeExecutionSessions,
        [deadlineId]: session,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('deadline_ide_sessions_v1', JSON.stringify(updatedSessions));
        } catch {
          // Ignore
        }
      }

      const providerMeta = ideProviderRegistry.getProvider(providerId)?.metadata;
      await storageService.addActivity({
        id: `act_${Date.now()}`,
        deadlineId,
        deadlineTitle: deadline.title,
        type: 'status_changed',
        title: `Launched ${providerMeta?.displayName || providerId} Session`,
        description: launchResult.message,
        timestamp: new Date().toISOString(),
      });

      const [updatedDeadlines, updatedActivities] = await Promise.all([
        storageService.getDeadlines(),
        storageService.getActivities(),
      ]);

      set({
        activeExecutionSessions: updatedSessions,
        isStartingIDESession: false,
        deadlines: updatedDeadlines,
        activities: updatedActivities,
      });

      return session;
    } catch (err) {
      const msg = (err as Error).message || 'Failed to start IDE session.';
      set({ isStartingIDESession: false, ideSessionError: msg });
      throw err;
    }
  },

  refreshIDESessionStatus: async (deadlineId: string) => {
    const session = get().activeExecutionSessions[deadlineId];
    if (!session) return null;

    try {
      const refreshed = await ideExecutionService.refreshSessionStatus(session);
      const updatedSessions = {
        ...get().activeExecutionSessions,
        [deadlineId]: refreshed,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('deadline_ide_sessions_v1', JSON.stringify(updatedSessions));
        } catch {
          // Ignore
        }
      }

      set({ activeExecutionSessions: updatedSessions });
      return refreshed;
    } catch {
      return session;
    }
  },

  stopIDESession: async (deadlineId: string) => {
    const session = get().activeExecutionSessions[deadlineId];
    if (!session) return false;

    try {
      const stopped = await ideExecutionService.stopSession(session);
      const stoppedSession: ExecutionSession = {
        ...session,
        status: 'cancelled',
        endedAt: new Date().toISOString(),
      };

      const updatedSessions = {
        ...get().activeExecutionSessions,
        [deadlineId]: stoppedSession,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('deadline_ide_sessions_v1', JSON.stringify(updatedSessions));
        } catch {
          // Ignore
        }
      }

      set({ activeExecutionSessions: updatedSessions });
      return stopped;
    } catch (e) {
      console.error('Failed to stop session', e);
      return false;
    }
  },

  inspectWorkspaceChanges: async (deadlineId: string) => {
    const session = get().activeExecutionSessions[deadlineId];
    const projectPath = session?.projectPath || get().selectedProjectPath;

    set({ isInspectingWorkspaceChanges: true });
    try {
      const changes = await ideExecutionService.verifyWorkspaceChanges(projectPath);
      set((state) => ({
        workspaceChanges: {
          ...state.workspaceChanges,
          [deadlineId]: changes,
        },
        isInspectingWorkspaceChanges: false,
      }));
      return changes;
    } catch (err) {
      set({ isInspectingWorkspaceChanges: false });
      throw err;
    }
  },

  // ==========================================
  // PHASE 4 PROJECT INITIALIZATION ACTIONS
  // ==========================================

  openPrepareProjectModal: () => set({ isPrepareProjectModalOpen: true }),
  closePrepareProjectModal: () => set({ isPrepareProjectModalOpen: false }),

  fetchHostRuntimes: async () => {
    try {
      const runtimes = await projectInitializationService.getHostRuntimes();
      set({ hostRuntimes: runtimes });
      return runtimes;
    } catch (e) {
      console.warn('Could not fetch host runtimes', e);
      const fallback: HostRuntimes = {
        node: { isInstalled: true, version: 'v20+' },
        npm: { isInstalled: true, version: '10+' },
        pnpm: { isInstalled: false },
        yarn: { isInstalled: false },
        python: { isInstalled: true, version: '3.9+' },
        pip: { isInstalled: true, version: '21+' },
        git: { isInstalled: true, version: '2+' },
      };
      set({ hostRuntimes: fallback });
      return fallback;
    }
  },

  pickNativeFolder: async (prompt = 'Select Project Location', startingDir?: string) => {
    set({ isPickingFolder: true });
    try {
      const res = await projectInitializationService.pickFolder(prompt, startingDir);
      set({ isPickingFolder: false });
      if (res.success && res.path) {
        set({ selectedProjectPath: res.path });
      }
      return res;
    } catch (err) {
      set({ isPickingFolder: false });
      return { success: false, error: (err as Error).message };
    }
  },

  inspectProjectDirectory: async (path: string) => {
    return await projectInitializationService.inspectProject(path);
  },

  saveProjectConfiguration: (deadlineId: string, config: ProjectConfiguration) => {
    const updated = {
      ...get().projectConfigurations,
      [deadlineId]: config,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('deadline_project_configs_v1', JSON.stringify(updated));
      } catch {
        /* storage quota or access error */
      }
    }
    set({
      projectConfigurations: updated,
      selectedProjectPath: config.projectPath,
    });
  },

  initializeProjectEnvironment: async (deadlineId: string, config: ProjectConfiguration) => {
    set({ isInitializingProject: true });

    const handleProgress = (event: InitializationProgressEvent) => {
      set((state) => {
        const existing = state.initializationProgressEvents[deadlineId] || [];
        return {
          initializationProgressEvents: {
            ...state.initializationProgressEvents,
            [deadlineId]: [...existing, event],
          },
        };
      });
    };

    try {
      const { report, error } = await projectInitializationService.initializeProject(
        config,
        handleProgress
      );

      const updatedConfigs = {
        ...get().projectConfigurations,
        [deadlineId]: config,
      };

      const updatedReports = {
        ...get().environmentReports,
        [deadlineId]: report,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('deadline_project_configs_v1', JSON.stringify(updatedConfigs));
          localStorage.setItem('deadline_env_reports_v1', JSON.stringify(updatedReports));
        } catch {
          /* storage quota or access error */
        }
      }

      set({
        projectConfigurations: updatedConfigs,
        environmentReports: updatedReports,
        selectedProjectPath: config.projectPath,
        isInitializingProject: false,
      });

      if (error && !report.isReady) {
        throw new Error(error);
      }

      return report;
    } catch (err) {
      set({ isInitializingProject: false });
      throw err;
    }
  },

  verifyProjectEnvironment: async (deadlineId: string, pathOverride?: string) => {
    const config = get().projectConfigurations[deadlineId];
    const path = pathOverride || config?.projectPath || get().selectedProjectPath;

    const report = await projectInitializationService.verifyEnvironment(path);
    const updatedReports = {
      ...get().environmentReports,
      [deadlineId]: report,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('deadline_env_reports_v1', JSON.stringify(updatedReports));
      } catch {
        /* storage quota or access error */
      }
    }

    set({ environmentReports: updatedReports });
    return report;
  },
}));
