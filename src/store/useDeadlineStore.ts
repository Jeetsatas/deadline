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
} from '@/types';
import { storageService } from '@/services/storage';
import { executionEngine } from '@/core/execution';
import { aiExecutionService } from '@/core/ai/AIExecutionService';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { maskApiKey } from '@/core/security/ICredentialStorage';
import { isDueToday, isDueTomorrow, createIsoFromLocal } from '@/lib/utils';
import { playMilestoneChime, playDeliverableChime } from '@/lib/audio';

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
  setProviderApiKey: (providerId: AIProviderId, apiKey: string) => Promise<void>;
  getMaskedApiKey: (providerId: AIProviderId) => Promise<string>;
  hasProviderApiKey: (providerId: AIProviderId) => Promise<boolean>;
  generateExecutionPlan: (deadlineId: string, customInstructions?: string, preferredProviderId?: AIProviderId) => Promise<AIExecutionPlan>;

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
  activeExecutionPlans: {},
  isTestingProvider: false,
  isGeneratingPlan: false,

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

      set({
        deadlines,
        activities,
        user,
        configuredProviders: parsedProviders,
        isLoading: false,
      });
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
}));
