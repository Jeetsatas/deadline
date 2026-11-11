import { describe, it, expect, beforeEach } from 'vitest';
import { prototypeRegistry, PrototypeTypeDefinition } from './index';
import { LocalStorageAdapter } from '@/services/storage/LocalStorageAdapter';
import { Deadline, ExecutionApproach } from '@/types';
import { createIsoFromLocal, getLocalDateString } from '@/lib/utils';

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val.toString();
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Product Experience & Prototype Selection Architecture Tests', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorageMock.clear();
    prototypeRegistry.clear();
    adapter = new LocalStorageAdapter();
  });

  it('1. Prototype Registry: handles registration, enabling, disabling and filtering', () => {
    const protoDef: PrototypeTypeDefinition = {
      id: 'interactive-calc-proto',
      name: 'Interactive Calculator Blueprint',
      description: 'Single-page lightweight prototype scaffold for calculator applications',
      enabled: true,
      badge: 'Interactive',
      supportedDeliverables: ['software', 'prototype', 'assignment'],
      configSchema: [
        {
          key: 'engine',
          label: 'Math Engine',
          type: 'select',
          options: [
            { label: 'Vanilla JS Math', value: 'vanilla' },
            { label: 'BigNumber precision', value: 'bignumber' },
          ],
        },
      ],
      metadata: { author: 'Deadline Core', version: '1.0.0' },
    };

    // Register
    prototypeRegistry.registerType(protoDef);
    expect(prototypeRegistry.hasType('interactive-calc-proto')).toBe(true);

    // Retrieve
    const retrieved = prototypeRegistry.getType('interactive-calc-proto');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Interactive Calculator Blueprint');

    // List enabled
    const enabledList = prototypeRegistry.listTypes({ enabledOnly: true });
    expect(enabledList.length).toBe(1);

    // Disable
    prototypeRegistry.disableType('interactive-calc-proto');
    expect(prototypeRegistry.listTypes({ enabledOnly: true }).length).toBe(0);
    expect(prototypeRegistry.listTypes({ enabledOnly: false }).length).toBe(1);

    // Re-enable
    prototypeRegistry.enableType('interactive-calc-proto');
    expect(prototypeRegistry.listTypes({ enabledOnly: true }).length).toBe(1);

    // Filter by deliverable
    const softwareList = prototypeRegistry.listTypes({ deliverableType: 'software' });
    expect(softwareList.length).toBe(1);

    const videoList = prototypeRegistry.listTypes({ deliverableType: 'video' });
    expect(videoList.length).toBe(0);

    // Unregister
    prototypeRegistry.unregisterType('interactive-calc-proto');
    expect(prototypeRegistry.hasType('interactive-calc-proto')).toBe(false);
  });

  it('2. Execution Approach: supports output_only, prototype_first, and guided_execution', async () => {
    const approaches: ExecutionApproach[] = ['output_only', 'prototype_first', 'guided_execution'];

    for (const approach of approaches) {
      const deadline: Deadline = {
        id: `dl_approach_${approach}`,
        title: `Project with ${approach}`,
        description: 'Testing approach selection',
        expectedOutput: `Deliverable for ${approach}`,
        minimumAcceptableOutput: `MVP for ${approach}`,
        priority: 'high',
        status: 'in_progress',
        deadlineDate: '2026-11-20',
        deadlineTime: '18:00',
        dueDateTime: '2026-11-20T18:00:00.000Z',
        progress: 0,
        deliverableType: 'software',
        executionApproach: approach,
        referenceLinks: [],
        attachments: [],
        milestones: [],
        tags: [approach],
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await adapter.saveDeadline(deadline);

      const reloaded = await adapter.getDeadline(`dl_approach_${approach}`);
      expect(reloaded?.executionApproach).toBe(approach);
    }
  });

  it('3. Prototype Selection Persistence: saves identifier and configuration', async () => {
    const deadlineWithPrototype: Deadline = {
      id: 'dl_proto_persisted',
      title: 'Calculator Application',
      description: 'Test prototype selection',
      expectedOutput: 'A working calculator prototype',
      minimumAcceptableOutput: 'Basic arithmetic calculator',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-11-12',
      deadlineTime: '23:59',
      dueDateTime: '2026-11-12T23:59:00.000Z',
      progress: 0,
      deliverableType: 'software',
      executionApproach: 'prototype_first',
      selectedPrototypeId: 'interactive-calc-proto',
      prototypeConfig: {
        engine: 'vanilla',
        shortcutsEnabled: true,
      },
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: ['calculator', 'prototype'],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(deadlineWithPrototype);

    // Instantiate fresh adapter to test persistence reload
    const freshAdapter = new LocalStorageAdapter();
    const fetched = await freshAdapter.getDeadline('dl_proto_persisted');

    expect(fetched).not.toBeNull();
    expect(fetched?.selectedPrototypeId).toBe('interactive-calc-proto');
    expect(fetched?.prototypeConfig).toEqual({
      engine: 'vanilla',
      shortcutsEnabled: true,
    });
    expect(fetched?.executionApproach).toBe('prototype_first');
  });

  it('4. Backward Compatibility: existing deadlines without prototype selections continue working', async () => {
    // Legacy deadline with no executionApproach or prototype fields
    const legacyDeadline: Deadline = {
      id: 'dl_legacy_01',
      title: 'Legacy Project Before Prototype Release',
      description: 'Older schema payload without new fields',
      expectedOutput: 'Legacy Deliverable Output',
      priority: 'medium',
      status: 'in_progress',
      deadlineDate: '2026-11-30',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-30T17:00:00.000Z',
      progress: 50,
      deliverableType: 'report',
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: ['legacy'],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(legacyDeadline);

    const reloaded = await adapter.getDeadline('dl_legacy_01');
    expect(reloaded).not.toBeNull();
    expect(reloaded?.title).toBe('Legacy Project Before Prototype Release');
    expect(reloaded?.selectedPrototypeId).toBeUndefined();
    expect(reloaded?.prototypeConfig).toBeUndefined();
    expect(reloaded?.executionApproach).toBeUndefined();

    // Updating legacy deadline adds new optional fields safely without breaking
    const updated = await adapter.updateDeadline('dl_legacy_01', {
      executionApproach: 'output_only',
      progress: 60,
    });

    expect(updated.executionApproach).toBe('output_only');
    expect(updated.progress).toBe(60);
  });

  it('5. Independence: Expected Output and Minimum Acceptable Output remain strictly independent', async () => {
    const deadline: Deadline = {
      id: 'dl_independence_test',
      title: 'Scope Triage Test',
      description: 'Testing independent field mutation',
      expectedOutput: 'Full Production Suite with 100 features and automated pipelines',
      minimumAcceptableOutput: 'Single CLI script that prints output without crashing',
      priority: 'critical',
      status: 'in_progress',
      deadlineDate: '2026-11-15',
      deadlineTime: '20:00',
      dueDateTime: '2026-11-15T20:00:00.000Z',
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

    // Mutate ONLY expected output
    await adapter.updateDeadline('dl_independence_test', {
      expectedOutput: 'Updated Scope: Production Web App',
    });

    let reloaded = await adapter.getDeadline('dl_independence_test');
    expect(reloaded?.expectedOutput).toBe('Updated Scope: Production Web App');
    expect(reloaded?.minimumAcceptableOutput).toBe('Single CLI script that prints output without crashing');

    // Mutate ONLY minimum acceptable output
    await adapter.updateDeadline('dl_independence_test', {
      minimumAcceptableOutput: 'Single static HTML page',
    });

    reloaded = await adapter.getDeadline('dl_independence_test');
    expect(reloaded?.expectedOutput).toBe('Updated Scope: Production Web App');
    expect(reloaded?.minimumAcceptableOutput).toBe('Single static HTML page');
  });

  it('6. Demonstration Scenario (Section 4): Student building Calculator Application tomorrow', async () => {
    // Demonstration scenario from user specification:
    // A student has a deadline tomorrow.
    // They need to build a calculator application.
    // Project: Calculator Application
    // Deliverable: Software/Application
    // Execution Approach: Prototype First
    // Expected Output: A working calculator application
    // Minimum Acceptable Output: Basic arithmetic calculator
    // Deadline: Tomorrow at 11:59 PM

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = getLocalDateString(tomorrow);
    const tomorrowDueIso = createIsoFromLocal(tomorrowDateStr, '23:59');

    const demoDeadline: Deadline = {
      id: 'demo_calculator_application',
      title: 'Calculator Application',
      description: 'Build a calculator application for university grading due tomorrow.',
      deliverableType: 'software',
      executionApproach: 'prototype_first',
      expectedOutput: 'A working calculator application.',
      minimumAcceptableOutput: 'Basic arithmetic calculator.',
      deadlineDate: tomorrowDateStr,
      deadlineTime: '23:59',
      dueDateTime: tomorrowDueIso,
      priority: 'critical',
      status: 'in_progress',
      progress: 25,
      milestones: [
        {
          id: 'ms_demo_1',
          deadlineId: 'demo_calculator_application',
          title: 'Minimum Working Prototype: Basic addition, subtraction, multiplication, division',
          isCompleted: true,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ms_demo_2',
          deadlineId: 'demo_calculator_application',
          title: 'Display and keypad keyboard input handling',
          isCompleted: false,
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ms_demo_3',
          deadlineId: 'demo_calculator_application',
          title: 'Deploy to live URL & verify submission link',
          isCompleted: false,
          order: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      referenceLinks: [
        {
          id: 'ref_calc_rubric',
          title: 'College Grading Rubric',
          url: 'https://university.edu/cs/calc-spec',
          createdAt: new Date().toISOString(),
        },
      ],
      attachments: [],
      tags: ['calculator', 'college', 'prototype-first'],
      notes: 'Remember: minimum acceptable output is basic arithmetic. Do not spend time on scientific graphing until prototype is working.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(demoDeadline);

    const reloaded = await adapter.getDeadline('demo_calculator_application');
    expect(reloaded).not.toBeNull();
    expect(reloaded?.title).toBe('Calculator Application');
    expect(reloaded?.deliverableType).toBe('software');
    expect(reloaded?.executionApproach).toBe('prototype_first');
    expect(reloaded?.expectedOutput).toBe('A working calculator application.');
    expect(reloaded?.minimumAcceptableOutput).toBe('Basic arithmetic calculator.');
    expect(reloaded?.deadlineTime).toBe('23:59');
    expect(reloaded?.priority).toBe('critical');
    expect(reloaded?.milestones.length).toBe(3);
    expect(reloaded?.milestones[0].isCompleted).toBe(true);
  });

  it('7. Data Import/Export: preserves new product concept fields across JSON cycle', async () => {
    const originalDeadline: Deadline = {
      id: 'dl_export_cycle',
      title: 'Full Cycle Project',
      description: 'Export cycle verification',
      expectedOutput: 'Target output',
      minimumAcceptableOutput: 'Fallback MVP',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-28',
      deadlineTime: '18:00',
      dueDateTime: '2026-11-28T18:00:00.000Z',
      progress: 30,
      deliverableType: 'prototype',
      executionApproach: 'prototype_first',
      selectedPrototypeId: 'generic-proto-spec',
      prototypeConfig: { mode: 'fast-track' },
      referenceLinks: [],
      attachments: [],
      milestones: [],
      tags: ['cycle'],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveDeadline(originalDeadline);

    const exportedJson = await adapter.exportAllData();
    expect(exportedJson).toContain('prototype_first');
    expect(exportedJson).toContain('generic-proto-spec');
    expect(exportedJson).toContain('fast-track');

    // Clear adapter and import
    localStorageMock.clear();
    const freshAdapter = new LocalStorageAdapter();
    const importSuccess = await freshAdapter.importData(exportedJson);
    expect(importSuccess).toBe(true);

    const restored = await freshAdapter.getDeadline('dl_export_cycle');
    expect(restored?.executionApproach).toBe('prototype_first');
    expect(restored?.selectedPrototypeId).toBe('generic-proto-spec');
    expect(restored?.prototypeConfig).toEqual({ mode: 'fast-track' });
  });
});
