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
      expect(gemini?.getMetadata().isImplemented).toBe(true);
      // Hardcoded fallback models removed by design; dynamic model discovery is the source of truth
      expect(gemini?.getMetadata().availableModels).toEqual([]);

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

  describe('4. Google Gemini Provider Implementation', () => {
    it('validates key presence and length', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');
      expect(gemini).toBeDefined();

      const emptyRes = await gemini!.testConnection('');
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.message).toContain('required');

      const shortRes = await gemini!.testConnection('123');
      expect(shortRes.success).toBe(false);
      expect(shortRes.message).toContain('length');
    });

    it('rejects invalid custom base URLs', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');
      const badUrlResult = await gemini!.testConnection('AIzaSy_test_key_12345', 'http://remote-insecure.com');
      expect(badUrlResult.success).toBe(false);
      expect(badUrlResult.message).toContain('HTTPS');
    });

    it('successfully connects with mock/test keys', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');
      const testResult = await gemini!.testConnection('mock_gemini_key_12345', undefined, 'gemini-2.0-flash');
      expect(testResult.success).toBe(true);
      expect(testResult.message).toContain('Connected');
      expect(testResult.model).toBe('gemini-2.0-flash');
    });

    it('handles simulated HTTP 401 unauthenticated response with useful error', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 401,
              message: 'API_KEY_INVALID: API key not valid. Please pass a valid API key.',
              status: 'UNAUTHENTICATED',
            },
          }),
          { status: 401, statusText: 'Unauthorized' }
        );

      try {
        const result = await gemini!.testConnection('AIzaSyBadKey1234567890');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Authentication failed');
        expect(result.message).toContain('Google AI Studio');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles simulated HTTP 429 quota exceeded response with useful error', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: 'Quota exceeded for quota metric "GenerateContentRequests".',
              status: 'RESOURCE_EXHAUSTED',
            },
          }),
          { status: 429, statusText: 'Too Many Requests' }
        );

      try {
        const result = await gemini!.testConnection('AIzaSyValidKey1234567890');
        expect(result.success).toBe(false);
        expect(result.message).toContain('RESOURCE_EXHAUSTED');
        expect(result.message).toContain('quota or rate limit');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles simulated HTTP 404 model not found response', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: 'models/gemini-non-existent is not found for API version v1beta.',
              status: 'NOT_FOUND',
            },
          }),
          { status: 404, statusText: 'Not Found' }
        );

      try {
        const result = await gemini!.testConnection('AIzaSyValidKey1234567890', undefined, 'gemini-non-existent');
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found or unavailable');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fetches live models list dynamically from Gemini endpoint', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');
      expect(gemini?.fetchAvailableModels).toBeDefined();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                description: 'Fast multimodal',
                inputTokenLimit: 1048576,
                supportedGenerationMethods: ['generateContent'],
              },
              {
                name: 'models/text-embedding-004',
                displayName: 'Text Embedding',
                supportedGenerationMethods: ['embedContent'], // Should be filtered out
              },
            ],
          }),
          { status: 200 }
        );

      try {
        const models = await gemini!.fetchAvailableModels!('AIzaSyKey123456789');
        expect(models.length).toBe(1);
        expect(models[0].id).toBe('gemini-2.0-flash');
        expect(models[0].name).toBe('Gemini 2.0 Flash');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('generates execution plan for software projects using Gemini', async () => {
      const deadline: Deadline = {
        id: 'dl_calc_gemini',
        title: 'Calculator Application with Gemini',
        description: 'Build full calculator',
        expectedOutput: 'A working calculator application.',
        minimumAcceptableOutput: 'Basic arithmetic calculator.',
        priority: 'critical',
        status: 'in_progress',
        deadlineDate: '2026-11-14',
        deadlineTime: '23:59',
        dueDateTime: '2026-11-14T23:59:00.000Z',
        progress: 0,
        deliverableType: 'software',
        executionApproach: 'prototype_first',
        referenceLinks: [],
        attachments: [],
        milestones: [],
        notes: '',
        tags: ['gemini', 'calculator'],
        createdAt: '2026-11-12',
        updatedAt: '2026-11-12',
      };

      const plan = await aiExecutionService.generateExecutionPlan(
        deadline,
        'gemini',
        'mock_gemini_api_key_12345'
      );

      expect(plan.deadlineId).toBe('dl_calc_gemini');
      expect(plan.providerId).toBe('gemini');
      expect(plan.suggestedMilestones.length).toBeGreaterThanOrEqual(3);
      expect(plan.firstActionableStep).toBeTruthy();
      expect(plan.deliverableSpecificGuidance).toBeTruthy();
    });

    it('parses structured JSON candidates correctly from real Gemini API format', async () => {
      const gemini = aiProviderRegistry.getProvider('gemini');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        taskUnderstanding: 'Build a production calculator app with clean shortcuts.',
                        suggestedApproach: 'Prototype First with unit tests.',
                        suggestedMilestones: [
                          { title: 'Core Math Engine', description: 'Arithmetic unit tests', order: 1, isCriticalPath: true },
                          { title: 'Responsive Keypad', description: 'Touch and key listeners', order: 2, isCriticalPath: true },
                        ],
                        requiredResources: ['TypeScript', 'Vite', 'Vitest'],
                        firstActionableStep: 'Create arithmetic evaluate function with basic operator precedence.',
                        deliverableSpecificGuidance: 'Ensure division by zero is handled safely.',
                      }),
                    },
                  ],
                  role: 'model',
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        );

      try {
        const deadline: Deadline = {
          id: 'dl_parse_gemini',
          title: 'Calculator App',
          description: 'Testing parser',
          expectedOutput: 'Working calculator',
          priority: 'high',
          status: 'in_progress',
          deadlineDate: '2026-11-14',
          deadlineTime: '18:00',
          dueDateTime: '2026-11-14T18:00:00.000Z',
          progress: 0,
          deliverableType: 'software',
          referenceLinks: [],
          attachments: [],
          milestones: [],
          notes: '',
          tags: [],
          createdAt: '2026-11-12',
          updatedAt: '2026-11-12',
        };

        const context = aiContextBuilder.buildContext(deadline);
        const plan = await gemini!.generatePlan(context, 'AIzaSyRealKey1234567890');

        expect(plan.taskUnderstanding).toBe('Build a production calculator app with clean shortcuts.');
        expect(plan.suggestedMilestones.length).toBe(2);
        expect(plan.suggestedMilestones[0].title).toBe('Core Math Engine');
        expect(plan.firstActionableStep).toContain('operator precedence');
        expect(plan.deliverableSpecificGuidance).toContain('division by zero');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('5. Credential Isolation & Export Protection', () => {
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

    it('never leaks Google Gemini API keys into LocalStorage or JSON export data', async () => {
      const geminiKey = 'AIzaSyGoogleGeminiSecretApiKey999888777';
      await credentialStorage.saveSecret('ai_key_gemini', geminiKey);

      expect(await credentialStorage.getSecret('ai_key_gemini')).toBe(geminiKey);

      const storageAdapter = new LocalStorageAdapter();
      const exportedJson = await storageAdapter.exportAllData();

      expect(exportedJson).not.toContain(geminiKey);
      expect(exportedJson).not.toContain('ai_key_gemini');

      for (const key in mockStorage) {
        expect(mockStorage[key]).not.toContain(geminiKey);
      }
    });
  });
});

