import { describe, it, expect } from 'vitest';
import { DefaultExecutionEngine } from './index';
import { Deadline, Milestone } from '@/types';

describe('ExecutionEngine', () => {
  const engine = new DefaultExecutionEngine();

  const mockMilestones: Milestone[] = [
    {
      id: 'm1',
      deadlineId: 'd1',
      title: 'Milestone 1',
      isCompleted: true,
      order: 1,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'm2',
      deadlineId: 'd1',
      title: 'Milestone 2',
      isCompleted: true,
      order: 2,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'm3',
      deadlineId: 'd1',
      title: 'Milestone 3',
      isCompleted: false,
      order: 3,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'm4',
      deadlineId: 'd1',
      title: 'Milestone 4',
      isCompleted: false,
      order: 4,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  it('calculates 50% progress when 2 out of 4 milestones are complete', () => {
    const progress = engine.calculateProgress(mockMilestones);
    expect(progress).toBe(50);
  });

  it('calculates 0% progress when milestone array is empty and no explicit progress is given', () => {
    const progress = engine.calculateProgress([]);
    expect(progress).toBe(0);
  });

  it('returns explicit progress if milestones array is empty', () => {
    const progress = engine.calculateProgress([], 80);
    expect(progress).toBe(80);
  });

  it('identifies critical bottleneck when deadline is overdue', () => {
    const overdueDeadline: Deadline = {
      id: 'test_dl',
      title: 'Test Deadline',
      description: 'Test',
      expectedOutput: 'Working system',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-11-01',
      deadlineTime: '10:00',
      dueDateTime: '2026-11-01T10:00:00.000Z', // in past
      progress: 40,
      deliverableType: 'software',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      notes: '',
      tags: [],
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };

    const bottlenecks = engine.identifyBottlenecks(overdueDeadline);
    expect(bottlenecks.some((b) => b.id === 'overdue')).toBe(true);
  });

  it('identifies bottleneck when critical deadline lacks minimum acceptable output definition', () => {
    const criticalDeadline: Deadline = {
      id: 'test_dl_2',
      title: 'Critical App',
      description: 'Test',
      expectedOutput: 'Complete working prototype',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-12-01',
      deadlineTime: '18:00',
      dueDateTime: '2026-12-01T18:00:00.000Z',
      progress: 20,
      deliverableType: 'prototype',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      notes: '',
      tags: [],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    };

    const bottlenecks = engine.identifyBottlenecks(criticalDeadline);
    expect(bottlenecks.some((b) => b.id === 'no-mvp')).toBe(true);
  });
});
