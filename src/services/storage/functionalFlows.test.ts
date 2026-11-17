import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { Deadline, FinalDeliverable } from '@/types';
import { DefaultExecutionEngine } from '@/core/execution';

// Mock localStorage for Node test runner
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let failWrites = false;
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error('QuotaExceededError');
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    setFailWrites: (value: boolean) => { failWrites = value; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Functional Workflows Audit & Persistence Testing', () => {
  let adapter: LocalStorageAdapter;
  const executionEngine = new DefaultExecutionEngine();

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setFailWrites(false);
    adapter = new LocalStorageAdapter();
  });

  it('starts with no fictional demo deadlines or activity on a fresh install', async () => {
    expect(await adapter.getDeadlines()).toEqual([]);
    expect(await adapter.getActivities()).toEqual([]);
  });

  it('removes known sample records while preserving user-created local records', async () => {
    localStorageMock.setItem('deadline_app_deadlines_v1', JSON.stringify([
      { id: 'dl_calc_2026', title: 'Sample fixture' },
      { id: 'user_deadline_01', title: 'My real project' },
    ]));
    localStorageMock.setItem('deadline_app_activities_v1', JSON.stringify([
      { id: 'act_1', title: 'Sample fixture' },
      { id: 'user_activity_01', title: 'My real activity' },
    ]));

    expect(await adapter.getDeadlines()).toEqual([{ id: 'user_deadline_01', title: 'My real project' }]);
    expect(await adapter.getActivities()).toEqual([{ id: 'user_activity_01', title: 'My real activity' }]);
  });

  it('does not report successful metadata persistence when browser storage is full', async () => {
    localStorageMock.setFailWrites(true);
    await expect(adapter.getDeadlines()).rejects.toThrow('Browser storage could not save');
  });

  it('Workflow 1, 4 & 5: Create a deadline, persist to LocalStorage, and reload across session simulation', async () => {
    const newDeadline: Deadline = {
      id: 'test_create_01',
      title: 'Automated Calculator Prototype',
      description: 'Functional audit test',
      expectedOutput: 'Working calculator build',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-11-20',
      deadlineTime: '18:00',
      dueDateTime: '2026-11-20T18:00:00.000Z',
      progress: 0,
      deliverableType: 'prototype',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: ['audit', 'prototype'],
      notes: 'Initial test notes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save
    await adapter.saveDeadline(newDeadline);

    // 4 & 5. Browser refresh simulation: Instantiate fresh adapter reading from localStorage
    const freshAdapter = new LocalStorageAdapter();
    const fetched = await freshAdapter.getDeadline('test_create_01');

    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Automated Calculator Prototype');
    expect(fetched?.priority).toBe('critical');
    expect(fetched?.expectedOutput).toBe('Working calculator build');
  });

  it('Workflow 2 & 3: Edit a deadline and delete a deadline', async () => {
    const deadline: Deadline = {
      id: 'test_edit_01',
      title: 'Initial Title',
      description: 'Desc',
      expectedOutput: 'Output 1',
      priority: 'medium',
      status: 'in_progress',
      deadlineDate: '2026-11-25',
      deadlineTime: '12:00',
      dueDateTime: '2026-11-25T12:00:00.000Z',
      progress: 10,
      deliverableType: 'software',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(deadline);

    // Edit
    const updated = await adapter.updateDeadline('test_edit_01', {
      title: 'Updated Title',
      progress: 40,
    });
    expect(updated.title).toBe('Updated Title');
    expect(updated.progress).toBe(40);

    // Delete
    const deleted = await adapter.deleteDeadline('test_edit_01');
    expect(deleted).toBe(true);

    const recheck = await adapter.getDeadline('test_edit_01');
    expect(recheck).toBeNull();
  });

  it('Workflow 6, 7 & 8: Add milestones, complete milestones, and verify automatic progress calculations', async () => {
    const deadline: Deadline = {
      id: 'test_milestones_01',
      title: 'Milestone Execution Test',
      description: 'Testing progress math',
      expectedOutput: 'Verified progress calculation',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-30',
      deadlineTime: '23:59',
      dueDateTime: '2026-11-30T23:59:00.000Z',
      progress: 0,
      deliverableType: 'software',
      referenceLinks: [],
      attachments: [],
      milestones: [
        {
          id: 'm1',
          deadlineId: 'test_milestones_01',
          title: 'Step 1: Setup',
          isCompleted: false,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'm2',
          deadlineId: 'test_milestones_01',
          title: 'Step 2: Core implementation',
          isCompleted: false,
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(deadline);

    // 0 milestones completed
    expect(executionEngine.calculateProgress(deadline.milestones)).toBe(0);

    // Complete milestone 1 -> 50%
    deadline.milestones[0].isCompleted = true;
    deadline.milestones[0].completedAt = new Date().toISOString();
    const prog1 = executionEngine.calculateProgress(deadline.milestones);
    expect(prog1).toBe(50);

    // Complete milestone 2 -> 100%
    deadline.milestones[1].isCompleted = true;
    deadline.milestones[1].completedAt = new Date().toISOString();
    const prog2 = executionEngine.calculateProgress(deadline.milestones);
    expect(prog2).toBe(100);

    // Update in storage
    const saved = await adapter.updateDeadline('test_milestones_01', {
      milestones: deadline.milestones,
      progress: prog2,
    });
    expect(saved.progress).toBe(100);
    expect(saved.milestones.every((m) => m.isCompleted)).toBe(true);
  });

  it('Workflow 9 & 10: Submit final deliverable and verify activity history', async () => {
    const deadline: Deadline = {
      id: 'test_sub_01',
      title: 'Conference Submission Paper',
      description: 'Paper testing',
      expectedOutput: 'Published 8-page PDF',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-11-15',
      deadlineTime: '23:59',
      dueDateTime: '2026-11-15T23:59:00.000Z',
      progress: 80,
      deliverableType: 'research_paper',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(deadline);

    const deliverable: FinalDeliverable = {
      id: 'deliv_conf_01',
      deadlineId: 'test_sub_01',
      title: 'Autonomous Multi-Agent Systems PDF',
      expectedOutput: 'Published 8-page PDF',
      summary: 'Camera ready PDF compiled and submitted to portal',
      deliverableType: 'research_paper',
      submissionFormat: 'url',
      resourceUri: 'https://arxiv.org/abs/2026.0001',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update deadline to completed with deliverable
    const updated = await adapter.updateDeadline('test_sub_01', {
      status: 'completed',
      progress: 100,
      finalDeliverable: deliverable,
    });

    expect(updated.status).toBe('completed');
    expect(updated.progress).toBe(100);
    expect(updated.finalDeliverable?.resourceUri).toBe('https://arxiv.org/abs/2026.0001');

    // Add activity
    await adapter.addActivity({
      id: 'act_test_01',
      deadlineId: 'test_sub_01',
      deadlineTitle: updated.title,
      type: 'deliverable_submitted',
      title: `Submitted deliverable for ${updated.title}`,
      timestamp: new Date().toISOString(),
    });

    const activities = await adapter.getActivities();
    expect(activities.some((a) => a.type === 'deliverable_submitted')).toBe(true);
  });

  it('Workflow 11 & 12: Export application data and import data cleanly', async () => {
    const exportedJson = await adapter.exportAllData();
    expect(typeof exportedJson).toBe('string');
    const parsed = JSON.parse(exportedJson);
    expect(parsed.version).toBe('1.0.0');
    expect(Array.isArray(parsed.deadlines)).toBe(true);

    // Modify JSON to simulate imported payload
    parsed.deadlines.push({
      id: 'imported_dl_01',
      title: 'Imported Project Deadline',
      description: 'Import test',
      expectedOutput: 'Imported artifact',
      priority: 'low',
      status: 'in_progress',
      deadlineDate: '2026-12-31',
      deadlineTime: '23:59',
      dueDateTime: '2026-12-31T23:59:00.000Z',
      progress: 15,
      deliverableType: 'software',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: ['imported'],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const importResult = await adapter.importData(JSON.stringify(parsed));
    expect(importResult).toBe(true);

    const reloaded = await adapter.getDeadline('imported_dl_01');
    expect(reloaded).not.toBeNull();
    expect(reloaded?.title).toBe('Imported Project Deadline');
  });

  it('Workflow 13: User profile and theme persistence', async () => {
    const user = await adapter.getUser();
    expect(user.name).toBe('Jeet Satasiya');

    // Switch to light theme
    const updated = await adapter.updateUser({
      preferences: {
        ...user.preferences,
        theme: 'light',
      },
    });
    expect(updated.preferences.theme).toBe('light');

    // Verify persistence across new adapter
    const reloadedAdapter = new LocalStorageAdapter();
    const reloadedUser = await reloadedAdapter.getUser();
    expect(reloadedUser.preferences.theme).toBe('light');
  });
});
