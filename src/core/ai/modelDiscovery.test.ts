import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiProvider } from './providers/GeminiProvider';
import { modelDiscoveryService } from './ModelDiscoveryService';
import { aiProviderRegistry } from './AIProviderRegistry';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Deadline } from '@/types';

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

describe('Dynamic AI Model Discovery System Suite', () => {
  const originalFetch = globalThis.fetch;
  let geminiProvider: GeminiProvider;

  beforeEach(async () => {
    localStorageMock.clear();
    await credentialStorage.clearAll();
    geminiProvider = new GeminiProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('1. Successful Model Discovery from Provider API', () => {
    it('fetches and normalizes models from Google Developer API endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                description: 'Next-gen flagship model',
                inputTokenLimit: 1048576,
                outputTokenLimit: 8192,
                supportedGenerationMethods: ['generateContent', 'countTokens'],
              },
              {
                name: 'models/gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro',
                description: 'Deep reasoning model',
                inputTokenLimit: 2097152,
                outputTokenLimit: 8192,
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await geminiProvider.discoverModels('AIzaSyValidProductionApiKey123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('models_loaded');
      expect(result.provider).toBe('gemini');
      expect(result.models.length).toBe(2);

      // Model ID normalization: must strip 'models/' prefix
      expect(result.models[0].id).toBe('gemini-2.0-flash');
      expect(result.models[0].displayName).toBe('Gemini 2.0 Flash');
      expect(result.models[0].inputTokenLimit).toBe(1048576);
      expect(result.models[0].supportedCapabilities).toContain('generateContent');

      expect(result.models[1].id).toBe('gemini-1.5-pro');
      expect(result.models[1].displayName).toBe('Gemini 1.5 Pro');
      expect(result.models[1].inputTokenLimit).toBe(2097152);
    });

    it('works through provider-agnostic ModelDiscoveryService', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              models: [
                {
                  name: 'models/gemini-2.5-flash',
                  displayName: 'Gemini 2.5 Flash',
                  inputTokenLimit: 1048576,
                  outputTokenLimit: 8192,
                  supportedGenerationMethods: ['generateContent'],
                },
              ],
            }),
            { status: 200 }
          )
        )
      );

      const result = await modelDiscoveryService.discoverModels('gemini', 'AIzaSyServiceKey456');
      expect(result.success).toBe(true);
      expect(result.models[0].id).toBe('gemini-2.5-flash');

      const isAvailable = await modelDiscoveryService.validateModelAvailability(
        'gemini',
        'gemini-2.5-flash',
        'AIzaSyServiceKey456'
      );
      expect(isAvailable).toBe(true);
    });
  });

  describe('2. Empty Model List Response Handling', () => {
    it('handles empty models list gracefully with no_compatible_models status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ models: [] }), { status: 200 })
      );

      const result = await geminiProvider.discoverModels('AIzaSyValidKeyWithNoModels');
      expect(result.models).toEqual([]);
      expect(result.status).toBe('no_compatible_models');
      expect(result.errorMessage).toBeTruthy();
    });
  });

  describe('3. Invalid API Key Error Handling', () => {
    it('returns invalid_key status when API key is rejected with 401 UNAUTHENTICATED', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 401,
              message: 'API key not valid. Please pass a valid API key.',
              status: 'UNAUTHENTICATED',
            },
          }),
          { status: 401 }
        )
      );

      const result = await geminiProvider.discoverModels('AIzaSyBadKey');
      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid_key');
      expect(result.models).toEqual([]);
      expect(result.errorMessage).toContain('Invalid Google Gemini API key');
    });
  });

  describe('4. Quota Exceeded Error Handling', () => {
    it('returns quota_exceeded status when 429 RESOURCE_EXHAUSTED is returned', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: 'Resource has been exhausted (e.g. check quota).',
              status: 'RESOURCE_EXHAUSTED',
            },
          }),
          { status: 429 }
        )
      );

      const result = await geminiProvider.discoverModels('AIzaSyRateLimitedKey');
      expect(result.success).toBe(false);
      expect(result.status).toBe('quota_exceeded');
      expect(result.models).toEqual([]);
      expect(result.errorMessage).toContain('quota or rate limit exceeded');
    });
  });

  describe('5. Network Failure Error Handling', () => {
    it('returns network_error status on network failure or connection timeout', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await geminiProvider.discoverModels('AIzaSyNetworkFailKey');
      expect(result.success).toBe(false);
      expect(result.status).toBe('network_error');
      expect(result.models).toEqual([]);
      expect(result.errorMessage).toContain('Failed to reach Google Gemini endpoint');
    });
  });

  describe('6. Model Capability Filtering Rules', () => {
    it('filters out embedding-only and non-generative models, retaining only generateContent models', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                supportedGenerationMethods: ['generateContent', 'countTokens'],
              },
              {
                name: 'models/text-embedding-004',
                displayName: 'Text Embedding 004',
                supportedGenerationMethods: ['embedContent'],
              },
              {
                name: 'models/aqa',
                displayName: 'Attributed Question Answering',
                supportedGenerationMethods: ['generateAnswer'],
              },
              {
                name: 'models/gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await geminiProvider.discoverModels('AIzaSyFilterTestKey');
      expect(result.success).toBe(true);
      expect(result.models.length).toBe(2);

      const modelIds = result.models.map((m) => m.id);
      expect(modelIds).toContain('gemini-2.0-flash');
      expect(modelIds).toContain('gemini-1.5-pro');
      expect(modelIds).not.toContain('text-embedding-004');
      expect(modelIds).not.toContain('aqa');
    });
  });

  describe('7. Discovered Models Containing Multiple Versions', () => {
    it('supports multiple generations and tiers simultaneously', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.5-flash',
                displayName: 'Gemini 2.5 Flash',
                inputTokenLimit: 1048576,
                supportedGenerationMethods: ['generateContent'],
              },
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                inputTokenLimit: 1048576,
                supportedGenerationMethods: ['generateContent'],
              },
              {
                name: 'models/gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro',
                inputTokenLimit: 2097152,
                supportedGenerationMethods: ['generateContent'],
              },
              {
                name: 'models/gemini-1.5-flash-8b',
                displayName: 'Gemini 1.5 Flash-8B',
                inputTokenLimit: 1048576,
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await geminiProvider.discoverModels('AIzaSyMultiVersionKey');
      expect(result.models.length).toBe(4);
      expect(result.models.map((m) => m.id)).toEqual([
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash-8b',
      ]);
    });
  });

  describe('8. Model Identifier Normalization', () => {
    it('normalizes model identifiers consistently by stripping models/ prefix', () => {
      expect(geminiProvider.cleanModelId('models/gemini-2.0-flash')).toBe('gemini-2.0-flash');
      expect(geminiProvider.cleanModelId('MODELS/gemini-1.5-pro')).toBe('gemini-1.5-pro');
      expect(geminiProvider.cleanModelId('gemini-2.5-flash')).toBe('gemini-2.5-flash');
      expect(geminiProvider.cleanModelId('  models/gemini-2.0-flash-lite  ')).toBe('gemini-2.0-flash-lite');
    });
  });

  describe('9. Model Validation Before Plan Generation', () => {
    const sampleDeadline: Deadline = {
      id: 'dl_validation_test',
      title: 'Mobile App Architecture',
      description: 'Test deadline validation',
      expectedOutput: 'Complete mobile app spec',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-20',
      deadlineTime: '17:00',
      dueDateTime: '2026-11-20T17:00:00.000Z',
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

    it('fails gracefully with exact required error message when selected model is unavailable', async () => {
      // Mock remote API returning 404 NOT_FOUND for unavailable model
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: 'models/deprecated-model-v0 is not found for API version v1beta',
              status: 'NOT_FOUND',
            },
          }),
          { status: 404 }
        )
      );

      const context = aiProviderRegistry.getProvider('gemini')!;
      await expect(
        context.generatePlan(
          {
            deadlineId: sampleDeadline.id,
            title: sampleDeadline.title,
            description: sampleDeadline.description,
            expectedOutput: sampleDeadline.expectedOutput,
            priority: 'high',
            deadlineDate: '2026-11-20',
            deadlineTime: '17:00',
            dueDateTime: '2026-11-20T17:00:00.000Z',
            deliverableType: 'software',
            milestones: [],
            referenceLinks: [],
          },
          'AIzaSyTestKey123',
          undefined,
          'deprecated-model-v0'
        )
      ).rejects.toThrow(
        'The selected model is no longer available for this API key. Refresh models and select another model.'
      );
    });

    it('validates selected model against discovered models list in Zustand store', async () => {
      const store = useDeadlineStore.getState();

      // Configure provider with a model that is NOT in the discovered list
      store.configuredProviders.gemini = {
        id: 'cfg_gemini',
        providerId: 'gemini',
        name: 'Google Gemini',
        selectedModelId: 'ghost-model-xyz',
        isEnabled: true,
        isConfigured: true,
        createdAt: '2026-11-12',
        updatedAt: '2026-11-12',
      };

      // Populate discovered models with valid models only
      store.discoveredModels.gemini = [
        {
          id: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          provider: 'gemini',
          supportedCapabilities: ['generateContent'],
          isAvailable: true,
        },
      ];

      // Save key in active memory
      await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSyMemoryKey123');

      // Add deadline to store
      store.deadlines = [sampleDeadline];

      // Attempting to generate plan with unavailable model must throw exact message
      await expect(
        store.generateExecutionPlan(sampleDeadline.id, undefined, 'gemini')
      ).rejects.toThrow(
        'The selected model is no longer available for this API key. Refresh models and select another model.'
      );
    });
  });

  describe('10. Plan Generation Using Dynamically Discovered Model', () => {
    it('successfully executes plan generation using discovered model ID', async () => {
      const store = useDeadlineStore.getState();

      const sampleDeadline: Deadline = {
        id: 'dl_discovered_exec',
        title: 'Interactive Dashboard Prototype',
        description: 'Test discovered execution',
        expectedOutput: 'Interactive dashboard MVP',
        priority: 'high',
        status: 'in_progress',
        deadlineDate: '2026-11-25',
        deadlineTime: '18:00',
        dueDateTime: '2026-11-25T18:00:00.000Z',
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

      store.deadlines = [sampleDeadline];

      // Discovered model gemini-2.0-flash
      store.discoveredModels.gemini = [
        {
          id: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          provider: 'gemini',
          supportedCapabilities: ['generateContent'],
          isAvailable: true,
        },
      ];

      store.configuredProviders.gemini = {
        id: 'cfg_gemini',
        providerId: 'gemini',
        name: 'Google Gemini',
        selectedModelId: 'gemini-2.0-flash',
        isEnabled: true,
        isConfigured: true,
        createdAt: '2026-11-12',
        updatedAt: '2026-11-12',
      };

      await credentialStorage.saveSecret('ai_key_gemini', 'mock_gemini_key_exec');

      const plan = await store.generateExecutionPlan(sampleDeadline.id, undefined, 'gemini');
      expect(plan).toBeDefined();
      expect(plan.providerId).toBe('gemini');
      expect(plan.modelId).toBe('gemini-2.0-flash');
      expect(plan.suggestedMilestones.length).toBeGreaterThan(0);
    });
  });

  describe('11. Zero API Key Leakage Verification', () => {
    it('strictly isolates API keys from LocalStorage, exports, and ModelDiscoveryResult', async () => {
      const secretProductionKey = 'AIzaSyTopSecretKeyNeverExposed998877';

      // Discovered models result never contains the API key
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const discoveryResult = await geminiProvider.discoverModels(secretProductionKey);
      const serializedDiscovery = JSON.stringify(discoveryResult);
      expect(serializedDiscovery).not.toContain(secretProductionKey);

      // Save in session memory
      await credentialStorage.saveSecret('ai_key_gemini', secretProductionKey);

      // Save discovered models to store & localStorage
      const store = useDeadlineStore.getState();
      await store.discoverProviderModels('gemini', secretProductionKey);

      // Inspect localStorage raw data
      const storedDiscoveredRaw = localStorage.getItem('deadline_app_discovered_models_v1') || '';
      expect(storedDiscoveredRaw).not.toContain(secretProductionKey);

      const storedProvidersRaw = localStorage.getItem('deadline_app_ai_providers_v1') || '';
      expect(storedProvidersRaw).not.toContain(secretProductionKey);

      // Inspect full exported data
      const exportedData = await store.exportData();
      expect(exportedData).not.toContain(secretProductionKey);

      // Verify key remains in memory
      expect(await credentialStorage.getSecret('ai_key_gemini')).toBe(secretProductionKey);
    });
  });
});
