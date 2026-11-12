import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { storageService } from '@/services/storage';
import { Deadline, ApprovedAIExecutionPlan } from '@/types';

// Mock localStorage for Node test runner
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Phase 2: AI-Powered Deadline Creation & Execution Workflow Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    localStorageMock.clear();
    useDeadlineStore.setState({
      deadlines: [],
      activities: [],
      configuredProviders: {},
      discoveredModels: {},
      activeExecutionPlans: {},
    });
    await credentialStorage.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Manual deadline creation continues working cleanly without AI configuration', async () => {
    const store = useDeadlineStore.getState();
    const deadlineData: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Manual Thesis Draft',
      description: 'Writing initial methodology section without AI assistance.',
      expectedOutput: 'A complete 15-page methodology manuscript.',
      minimumAcceptableOutput: 'Methodology outline and empirical data table.',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      progress: 0,
      deliverableType: 'research_paper',
      executionApproach: 'output_only',
      milestones: [
        {
          id: 'ms_manual_1',
          deadlineId: '',
          title: 'Draft literature survey',
          isCompleted: false,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      referenceLinks: [],
      attachments: [],
      tags: ['academic', 'manual'],
      notes: 'No AI copilot required.',
      aiConfig: { mode: 'manual' },
    };

    const created = await store.createDeadline(deadlineData);

    expect(created.id).toBeTruthy();
    expect(created.title).toBe('Manual Thesis Draft');
    expect(created.aiConfig?.mode).toBe('manual');
    expect(created.approvedPlan).toBeUndefined();
    expect(created.milestones.length).toBe(1);

    const retrieved = await storageService.getDeadline(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Manual Thesis Draft');
  });

  it('2. AI-assisted deadline creation stores approved plan, provider, model, version, and imported milestones', async () => {
    const store = useDeadlineStore.getState();

    const sampleApprovedPlan: ApprovedAIExecutionPlan = {
      id: 'plan_test_calc_001',
      deadlineId: 'dl_ai_calc_1',
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      generatedAt: '2026-11-12T10:00:00.000Z',
      approvedAt: '2026-11-12T10:05:00.000Z',
      version: 1,
      approvalStatus: 'approved',
      taskUnderstanding: 'Build a browser-based arithmetic calculator with keyboard listener support.',
      suggestedApproach: 'Prototype-first: implement calculation engine, then build keyboard UI.',
      suggestedMilestones: [
        {
          title: 'Implement calculation engine & edge cases',
          description: 'Basic arithmetic with division-by-zero protection',
          order: 1,
          isCriticalPath: true,
        },
        {
          title: 'Construct responsive keypad and display',
          description: 'Build UI with CSS grid and keyboard shortcut bindings',
          order: 2,
          isCriticalPath: true,
        },
        {
          title: 'Verify live operations and deploy prototype',
          description: 'Run through test suite and deploy to web host',
          order: 3,
          isCriticalPath: true,
        },
      ],
      requiredResources: ['React', 'TypeScript', 'Tailwind CSS'],
      firstActionableStep: 'Create arithmetic evaluation test file and verify basic operations.',
      deliverableSpecificGuidance: 'Ensure all math operations format decimals cleanly.',
      isEditedByUser: false,
      latencyMs: 1140,
    };

    const created = await store.createDeadline({
      title: 'AI-Assisted Calculator',
      description: 'Calculator built with Gemini plan assistance',
      expectedOutput: 'A fully working calculator application.',
      minimumAcceptableOutput: 'Basic arithmetic calculator.',
      priority: 'high',
      status: 'in_progress',
      progress: 0,
      deadlineDate: '2026-11-13',
      deadlineTime: '23:59',
      dueDateTime: '2026-11-13T23:59:00.000Z',
      deliverableType: 'software',
      executionApproach: 'prototype_first',
      milestones: sampleApprovedPlan.suggestedMilestones.map((m, idx) => ({
        id: `ms_imp_${idx}`,
        deadlineId: '',
        title: m.title,
        description: m.description,
        isCompleted: false,
        order: idx + 1,
        isCriticalPath: m.isCriticalPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      referenceLinks: [],
      attachments: [],
      tags: ['gemini', 'calculator'],
      notes: '',
      aiConfig: {
        mode: 'ai_assisted',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
      approvedPlan: sampleApprovedPlan,
    });

    expect(created.id).toBeTruthy();
    expect(created.aiConfig?.mode).toBe('ai_assisted');
    expect(created.approvedPlan).toBeDefined();
    expect(created.approvedPlan?.version).toBe(1);
    expect(created.approvedPlan?.providerId).toBe('gemini');
    expect(created.approvedPlan?.modelId).toBe('gemini-2.0-flash');
    expect(created.approvedPlan?.approvalStatus).toBe('approved');
    expect(created.milestones.length).toBe(3);
    expect(created.milestones[0].title).toBe('Implement calculation engine & edge cases');
  });

  it('3. Throws explicit error when session memory lacks API credentials', async () => {
    const store = useDeadlineStore.getState();

    const sampleDeadline: Deadline = {
      id: 'dl_no_key_test',
      title: 'Missing Key Project',
      description: 'Testing key requirement',
      expectedOutput: 'Output deliverable',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      progress: 0,
      deliverableType: 'software',
      milestones: [],
      referenceLinks: [],
      attachments: [],
      notes: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await store.createDeadline(sampleDeadline);

    await expect(
      store.generateExecutionPlan(created.id, undefined, 'gemini')
    ).rejects.toThrow(/No API key found in active memory/i);
  });

  it('4. Successfully updates approved plan and sets isEditedByUser flag', async () => {
    const store = useDeadlineStore.getState();

    const created = await store.createDeadline({
      title: 'Plan Edit Test Project',
      description: 'Testing manual edits to AI plan',
      expectedOutput: 'Refined deliverable',
      priority: 'medium',
      status: 'in_progress',
      progress: 0,
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      deliverableType: 'software',
      milestones: [],
      referenceLinks: [],
      attachments: [],
      tags: [],
      notes: '',
      approvedPlan: {
        id: 'plan_edit_01',
        deadlineId: '',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        version: 1,
        approvalStatus: 'approved',
        taskUnderstanding: 'Initial AI understanding',
        suggestedApproach: 'Initial AI approach',
        suggestedMilestones: [
          { title: 'Step 1', description: 'Desc 1', order: 1, isCriticalPath: true },
        ],
        requiredResources: ['Tool A'],
        firstActionableStep: 'Initial step',
        isEditedByUser: false,
      },
    });

    await store.updateApprovedPlan(created.id, {
      taskUnderstanding: 'User customized understanding of deliverable',
      firstActionableStep: 'Open terminal and initialize repo in under 5 minutes',
    });

    const updated = useDeadlineStore.getState().deadlines.find((d) => d.id === created.id);
    expect(updated?.approvedPlan?.taskUnderstanding).toBe('User customized understanding of deliverable');
    expect(updated?.approvedPlan?.firstActionableStep).toBe('Open terminal and initialize repo in under 5 minutes');
    expect(updated?.approvedPlan?.isEditedByUser).toBe(true);
  });

  it('5. Imports milestones into checklist and prevents duplicate titles', async () => {
    const store = useDeadlineStore.getState();

    const created = await store.createDeadline({
      title: 'Milestone Import Test',
      description: 'Testing duplicate prevention',
      expectedOutput: 'Working output',
      priority: 'high',
      status: 'in_progress',
      progress: 0,
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      deliverableType: 'software',
      milestones: [
        {
          id: 'ms_existing_1',
          deadlineId: '',
          title: 'Core Engine Logic', // matches candidate title below in a case-insensitive manner
          description: 'Pre-existing milestone',
          isCompleted: false,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      referenceLinks: [],
      attachments: [],
      tags: [],
      notes: '',
      approvedPlan: {
        id: 'plan_import_01',
        deadlineId: '',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        version: 1,
        approvalStatus: 'approved',
        taskUnderstanding: 'Understanding',
        suggestedApproach: 'Approach',
        suggestedMilestones: [
          {
            title: 'core engine logic', // Duplicate of existing
            description: 'Duplicate',
            order: 1,
            isCriticalPath: true,
          },
          {
            title: 'Build UI Keypad', // Brand new milestone
            description: 'New milestone to import',
            order: 2,
            isCriticalPath: true,
          },
        ],
        requiredResources: [],
        firstActionableStep: 'Step 1',
      },
    });

    expect(created.milestones.length).toBe(1);

    const importResult = await store.importPlanMilestones(created.id);
    expect(importResult.importedCount).toBe(1); // Only non-duplicate milestone imported

    const refreshed = useDeadlineStore.getState().deadlines.find((d) => d.id === created.id);
    expect(refreshed?.milestones.length).toBe(2);
    expect(refreshed?.milestones[0].title).toBe('Core Engine Logic');
    expect(refreshed?.milestones[1].title).toBe('Build UI Keypad');

    // A second import attempt should import 0 because all are now duplicates
    const secondImportResult = await store.importPlanMilestones(created.id);
    expect(secondImportResult.importedCount).toBe(0);
  });

  it('6. Plan regeneration creates a new version and preserves previous plan in history', async () => {
    const store = useDeadlineStore.getState();

    const created = await store.createDeadline({
      title: 'Plan Version History Test',
      description: 'Testing version bumping',
      expectedOutput: 'Versioned output',
      priority: 'high',
      status: 'in_progress',
      progress: 50,
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      deliverableType: 'software',
      milestones: [
        {
          id: 'ms_done_1',
          deadlineId: '',
          title: 'Initial working milestone',
          isCompleted: true,
          completedAt: new Date().toISOString(),
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      referenceLinks: [],
      attachments: [],
      tags: [],
      notes: '',
      approvedPlan: {
        id: 'plan_v1',
        deadlineId: '',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        version: 1,
        approvalStatus: 'approved',
        taskUnderstanding: 'Plan v1',
        suggestedApproach: 'Approach v1',
        suggestedMilestones: [],
        requiredResources: [],
        firstActionableStep: 'Step v1',
      },
    });

    const v2Plan: ApprovedAIExecutionPlan = {
      id: 'plan_v2',
      deadlineId: created.id,
      providerId: 'anthropic',
      modelId: 'claude-3-7-sonnet-latest',
      generatedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      version: 2,
      approvalStatus: 'approved',
      taskUnderstanding: 'Plan v2 with Claude',
      suggestedApproach: 'Approach v2 with Claude',
      suggestedMilestones: [],
      requiredResources: [],
      firstActionableStep: 'Step v2',
    };

    await store.saveApprovedPlan(created.id, v2Plan);

    const refreshed = useDeadlineStore.getState().deadlines.find((d) => d.id === created.id);
    expect(refreshed?.approvedPlan?.version).toBe(2);
    expect(refreshed?.approvedPlan?.providerId).toBe('anthropic');
    expect(refreshed?.approvedPlan?.taskUnderstanding).toBe('Plan v2 with Claude');
    expect(refreshed?.planHistory?.length).toBe(1);
    expect(refreshed?.planHistory?.[0].version).toBe(1);

    // Completed milestone progress must be preserved
    expect(refreshed?.milestones[0].isCompleted).toBe(true);
  });

  it('7. Guarantees zero API keys are stored in deadline objects or exported JSON', async () => {
    const store = useDeadlineStore.getState();

    // Set real-looking key in session memory
    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_super_secret_key_12345');

    const created = await store.createDeadline({
      title: 'Security Verification Project',
      description: 'Checking zero credential leakage',
      expectedOutput: 'Verified secure output',
      priority: 'high',
      status: 'in_progress',
      progress: 0,
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
      deliverableType: 'software',
      milestones: [],
      referenceLinks: [],
      attachments: [],
      tags: [],
      notes: '',
      aiConfig: {
        mode: 'ai_assisted',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
      approvedPlan: {
        id: 'plan_sec_01',
        deadlineId: '',
        providerId: 'gemini',
        modelId: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        version: 1,
        approvalStatus: 'approved',
        taskUnderstanding: 'Safe understanding',
        suggestedApproach: 'Safe approach',
        suggestedMilestones: [],
        requiredResources: [],
        firstActionableStep: 'Safe step',
      },
    });

    // Check deadline in store and storage
    const target = useDeadlineStore.getState().deadlines.find((d) => d.id === created.id);
    const serializedDeadline = JSON.stringify(target);
    expect(serializedDeadline).not.toContain('AIzaSy_super_secret_key_12345');
    expect(serializedDeadline).not.toContain('super_secret');

    // Check full JSON export
    const exportedJson = await store.exportData();
    expect(exportedJson).not.toContain('AIzaSy_super_secret_key_12345');
    expect(exportedJson).not.toContain('super_secret');
  });
});
