import { describe, it, expect, beforeEach } from 'vitest';
import { aiProviderRegistry } from './AIProviderRegistry';
import { aiContextBuilder } from './AIContextBuilder';
import { aiExecutionService } from './AIExecutionService';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { LocalStorageAdapter } from '@/services/storage/LocalStorageAdapter';
import { Deadline, DeliverableType } from '@/types';

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

describe('AI Integration Foundation Suite', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    await credentialStorage.clearAll();
  });

  describe('1. AI Provider Registry & Implementation Status', () => {
    it('registers default providers and identifies Anthropic as implemented', () => {
      const providers = aiProviderRegistry.listProviders();
      expect(providers.length).toBeGreaterThanOrEqual(4);

      const anthropic = aiProviderRegistry.getProvider('anthropic');
      expect(anthropic).toBeDefined();
      expect(anthropic?.getMetadata().isImplemented).toBe(true);
      expect(anthropic?.getMetadata().availableModels.length).toBeGreaterThanOrEqual(3);

      const openai = aiProviderRegistry.getProvider('openai');
      expect(openai).toBeDefined();
      expect(openai?.getMetadata().isImplemented).toBe(false);

      const gemini = aiProviderRegistry.getProvider('gemini');
      expect(gemini).toBeDefined();
      expect(gemini?.getMetadata().isImplemented).toBe(false);

      const compatible = aiProviderRegistry.getProvider('openai_compatible');
      expect(compatible).toBeDefined();
      expect(compatible?.getMetadata().isImplemented).toBe(false);
    });
  });

  describe('2. Deliverable-Agnostic Context Builder', () => {
    const testCategories: DeliverableType[] = [
      'software',
      'presentation',
      'research_paper',
      'assignment',
      'report',
      'design',
      'video',
      'other',
    ];

    testCategories.forEach((cat) => {
      it(`builds tailored context and system prompt for category: "${cat}"`, () => {
        const deadline: Deadline = {
          id: `dl_${cat}_test`,
          title: `Project for ${cat}`,
          description: `Comprehensive context for ${cat} deliverable`,
          expectedOutput: `Finished ${cat} output deliverable`,
          minimumAcceptableOutput: `Minimal viable ${cat}`,
          priority: 'high',
          status: 'in_progress',
          deadlineDate: '2026-11-20',
          deadlineTime: '17:00',
          dueDateTime: '2026-11-20T17:00:00.000Z',
          progress: 20,
          deliverableType: cat,
          executionApproach: 'prototype_first',
          referenceLinks: [{ id: 'ref_1', title: 'Spec', url: 'https://specs.example.com', createdAt: '2026-11-12' }],
          attachments: [],
          milestones: [
            {
              id: 'm_1',
              deadlineId: `dl_${cat}_test`,
              title: 'Initial Draft',
              isCompleted: false,
              order: 1,
              createdAt: '2026-11-12',
              updatedAt: '2026-11-12',
            },
          ],
          notes: '',
          tags: ['test', cat],
          createdAt: '2026-11-12',
          updatedAt: '2026-11-12',
        };

        const context = aiContextBuilder.buildContext(deadline, 'Prioritize clarity and rapid completion');
        expect(context.deliverableType).toBe(cat);
        expect(context.expectedOutput).toContain(cat);
        expect(context.customInstructions).toBe('Prioritize clarity and rapid completion');

        const systemPrompt = aiContextBuilder.buildSystemPrompt(cat);
        expect(systemPrompt).toContain('The output matters more than the activity');

        const userPrompt = aiContextBuilder.buildUserPrompt(context);
        expect(userPrompt).toContain(deadline.title);
        expect(userPrompt).toContain('TARGET EXPECTED OUTPUT');
        expect(userPrompt).toContain('MINIMUM ACCEPTABLE OUTPUT');
      });
    });
  });

  describe('3. Anthropic Provider Connection & Plan Generation', () => {
    it('rejects keys without proper format', async () => {
      const anthropic = aiProviderRegistry.getProvider('anthropic');
      expect(anthropic).toBeDefined();

      const invalidResult = await anthropic!.testConnection('invalid-random-key');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('sk-ant-');
    });

    it('rejects invalid custom base URLs', async () => {
      const anthropic = aiProviderRegistry.getProvider('anthropic');
      const badUrlResult = await anthropic!.testConnection('sk-ant-test', 'http://remote-insecure.com');
      expect(badUrlResult.success).toBe(false);
      expect(badUrlResult.message).toContain('HTTPS');
    });

    it('successfully connects with mock/test keys', async () => {
      const anthropic = aiProviderRegistry.getProvider('anthropic');
      const testResult = await anthropic!.testConnection('mock_anthropic_key_12345');
      expect(testResult.success).toBe(true);
      expect(testResult.message).toContain('Connected');
      expect(testResult.model).toBeDefined();
    });

    it('generates structured execution plan for software projects', async () => {
      const deadline: Deadline = {
        id: 'dl_calc_sample',
        title: 'Calculator Application',
        description: 'Build arithmetic calculator',
        expectedOutput: 'A working calculator application.',
        minimumAcceptableOutput: 'Basic arithmetic calculator.',
        priority: 'critical',
        status: 'in_progress',
        deadlineDate: '2026-11-13',
        deadlineTime: '23:59',
        dueDateTime: '2026-11-13T23:59:00.000Z',
        progress: 0,
        deliverableType: 'software',
        executionApproach: 'prototype_first',
        referenceLinks: [],
        attachments: [],
        milestones: [],
        notes: '',
        tags: ['calc'],
        createdAt: '2026-11-12',
        updatedAt: '2026-11-12',
      };

      const plan = await aiExecutionService.generateExecutionPlan(
        deadline,
        'anthropic',
        'mock_sk_ant_key_test_123'
      );

      expect(plan.deadlineId).toBe('dl_calc_sample');
      expect(plan.providerId).toBe('anthropic');
      expect(plan.suggestedMilestones.length).toBeGreaterThanOrEqual(3);
      expect(plan.firstActionableStep).toBeTruthy();
      expect(plan.deliverableSpecificGuidance).toBeTruthy();
      expect(plan.requiredResources.length).toBeGreaterThan(0);
    });

    it('generates structured execution plan for non-software presentation projects', async () => {
      const deadline: Deadline = {
        id: 'dl_deck_sample',
        title: 'Series Seed Investor Pitch Deck',
        description: 'Prepare pitch presentation for seed round',
        expectedOutput: 'A 10-slide polished pitch presentation PDF.',
        minimumAcceptableOutput: '6-slide core story draft.',
        priority: 'high',
        status: 'in_progress',
        deadlineDate: '2026-11-15',
        deadlineTime: '18:00',
        dueDateTime: '2026-11-15T18:00:00.000Z',
        progress: 0,
        deliverableType: 'presentation',
        executionApproach: 'guided_execution',
        referenceLinks: [],
        attachments: [],
        milestones: [],
        notes: '',
        tags: ['pitch'],
        createdAt: '2026-11-12',
        updatedAt: '2026-11-12',
      };

      const plan = await aiExecutionService.generateExecutionPlan(
        deadline,
        'anthropic',
        'mock_sk_ant_key_test_123'
      );

      expect(plan.deadlineId).toBe('dl_deck_sample');
      // Verifies presentation-specific milestones
      expect(plan.suggestedMilestones[0].title).toContain('Narrative Arc');
      expect(plan.firstActionableStep).toBeTruthy();
    });
  });

  describe('4. Credential Isolation & Export Protection', () => {
    it('never leaks API keys into LocalStorage or JSON export data', async () => {
      const secretKey = 'sk-ant-super-secret-production-token-998877';
      await credentialStorage.saveSecret('ai_key_anthropic', secretKey);

      // Verify in memory
      expect(await credentialStorage.getSecret('ai_key_anthropic')).toBe(secretKey);

      // Verify LocalStorage does NOT contain the secret
      const storageAdapter = new LocalStorageAdapter();
      const exportedJson = await storageAdapter.exportAllData();

      expect(exportedJson).not.toContain(secretKey);
      expect(exportedJson).not.toContain('ai_key_anthropic');

      // Verify direct inspect on all localStorage keys
      for (const key in mockStorage) {
        expect(mockStorage[key]).not.toContain(secretKey);
      }
    });
  });
});
