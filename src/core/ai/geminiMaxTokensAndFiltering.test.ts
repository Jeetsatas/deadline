import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiProvider, isCompatibleTextModel, GoogleModelEntry } from './providers/GeminiProvider';
import { AIContext } from './types';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';

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

describe('Gemini Text Model Selection & MAX_TOKENS Recovery Suite', () => {
  const originalFetch = globalThis.fetch;
  let provider: GeminiProvider;

  const sampleContext: AIContext = {
    deadlineId: 'dl_test_123',
    title: 'Calculator Application',
    description: 'Calculator app with UI',
    deliverableType: 'software',
    expectedOutput: 'Fully functional arithmetic calculator with keyboard listener',
    minimumAcceptableOutput: 'Basic integer math evaluator',
    priority: 'high',
    executionApproach: 'prototype_first',
    deadlineDate: '2026-11-20',
    deadlineTime: '18:00',
    dueDateTime: '2026-11-20T18:00:00.000Z',
    milestones: [],
    referenceLinks: [],
  };

  const validFiveSectionJson = JSON.stringify({
    taskUnderstanding: 'Build a browser-based arithmetic calculator with keyboard support.',
    suggestedApproach: 'Prototype-first: implement calculation engine, then bind UI keypad.',
    suggestedMilestones: [
      {
        title: 'Implement arithmetic calculation engine',
        description: 'Implement add, subtract, multiply, divide with divide-by-zero checks',
        order: 1,
        isCriticalPath: true,
      },
      {
        title: 'Construct responsive keypad layout',
        description: 'Build grid layout with display panel and keyboard shortcuts',
        order: 2,
        isCriticalPath: true,
      },
      {
        title: 'Deploy live prototype and verify test cases',
        description: 'Deploy to host and test decimal operations and edge cases',
        order: 3,
        isCriticalPath: true,
      },
    ],
    requiredResources: ['React 18', 'TypeScript', 'Tailwind CSS'],
    firstActionableStep: 'Create arithmetic evaluation test file and verify basic operations.',
    deliverableSpecificGuidance: 'Ensure all math operations format decimals cleanly.',
  });

  beforeEach(async () => {
    localStorageMock.clear();
    await credentialStorage.clearAll();
    provider = new GeminiProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('1. Model Compatibility & Exclusion Rules (isCompatibleTextModel)', () => {
    it('accepts standard Gemini text models', () => {
      const flash: GoogleModelEntry = {
        name: 'models/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        description: 'Fast multimodal model',
        supportedGenerationMethods: ['generateContent'],
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
      };
      const pro: GoogleModelEntry = {
        name: 'models/gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'Deep reasoning model',
        supportedGenerationMethods: ['generateContent', 'countTokens'],
        inputTokenLimit: 2097152,
        outputTokenLimit: 8192,
      };
      const flash25: GoogleModelEntry = {
        name: 'models/gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        description: 'Next-gen flash model',
        supportedGenerationMethods: ['generateContent'],
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
      };

      expect(isCompatibleTextModel(flash)).toBe(true);
      expect(isCompatibleTextModel(pro)).toBe(true);
      expect(isCompatibleTextModel(flash25)).toBe(true);
    });

    it('strictly excludes Text-to-Speech (TTS) models', () => {
      const ttsModel1: GoogleModelEntry = {
        name: 'models/gemini-3.8-flash-tts',
        displayName: 'Gemini 3.8 Flash TTS',
        description: 'Text-to-speech audio synthesis model',
        supportedGenerationMethods: ['generateContent'],
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
      };
      const ttsModel2: GoogleModelEntry = {
        name: 'models/gemini-2.0-flash-tts',
        displayName: 'Gemini 2.0 Flash Text-to-Speech',
        supportedGenerationMethods: ['generateContent'],
      };

      expect(isCompatibleTextModel(ttsModel1)).toBe(false);
      expect(isCompatibleTextModel(ttsModel2)).toBe(false);
    });

    it('strictly excludes embedding, image, audio, and evaluation models', () => {
      const embedding: GoogleModelEntry = {
        name: 'models/text-embedding-004',
        displayName: 'Text Embedding 004',
        supportedGenerationMethods: ['embedContent'],
      };
      const imagen: GoogleModelEntry = {
        name: 'models/imagen-3.0-generate-002',
        displayName: 'Imagen 3.0',
        supportedGenerationMethods: ['generateContent'],
      };
      const audioModel: GoogleModelEntry = {
        name: 'models/gemini-audio-preview',
        displayName: 'Gemini Audio Preview',
        supportedGenerationMethods: ['generateContent'],
      };
      const aqa: GoogleModelEntry = {
        name: 'models/aqa',
        displayName: 'Attributed Question Answering',
        supportedGenerationMethods: ['generateContent'],
      };

      expect(isCompatibleTextModel(embedding)).toBe(false);
      expect(isCompatibleTextModel(imagen)).toBe(false);
      expect(isCompatibleTextModel(audioModel)).toBe(false);
      expect(isCompatibleTextModel(aqa)).toBe(false);
    });

    it('excludes models where outputModalities does not include TEXT', () => {
      const audioOnlyModality: GoogleModelEntry = {
        name: 'models/gemini-voice',
        displayName: 'Gemini Voice',
        supportedGenerationMethods: ['generateContent'],
        outputModalities: ['AUDIO'],
      };
      expect(isCompatibleTextModel(audioOnlyModality)).toBe(false);
    });
  });

  describe('2. Dynamic Discovery Filters Out Incompatible Models', () => {
    it('returns only compatible text models from Google Developer API endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                supportedGenerationMethods: ['generateContent'],
                inputTokenLimit: 1048576,
                outputTokenLimit: 8192,
              },
              {
                name: 'models/gemini-3.8-flash-tts',
                displayName: 'Gemini 3.8 Flash TTS',
                description: 'TTS synthesis',
                supportedGenerationMethods: ['generateContent'],
              },
              {
                name: 'models/text-embedding-004',
                displayName: 'Text Embedding 004',
                supportedGenerationMethods: ['embedContent'],
              },
              {
                name: 'models/gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro',
                supportedGenerationMethods: ['generateContent'],
                inputTokenLimit: 2097152,
                outputTokenLimit: 8192,
              },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await provider.discoverModels('AIzaSyValidApiKey123');
      expect(result.success).toBe(true);
      expect(result.models.length).toBe(2);

      const ids = result.models.map((m) => m.id);
      expect(ids).toContain('gemini-2.0-flash');
      expect(ids).toContain('gemini-1.5-pro');
      expect(ids).not.toContain('gemini-3.8-flash-tts');
      expect(ids).not.toContain('text-embedding-004');
    });
  });

  describe('3. Generation Configuration & Token Capacity', () => {
    it('sends default maxOutputTokens of 8192 and structured responseSchema in generateContent payload', async () => {
      let capturedPayload: {
        generationConfig: {
          maxOutputTokens: number;
          responseMimeType: string;
          responseSchema?: { required: string[] };
        };
      } | undefined;

      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        capturedPayload = JSON.parse(init.body);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: validFiveSectionJson }],
                  },
                  finishReason: 'STOP',
                },
              ],
            }),
            { status: 200 }
          )
        );
      });

      const plan = await provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash');

      expect(capturedPayload).toBeDefined();
      if (capturedPayload) {
        expect(capturedPayload.generationConfig.maxOutputTokens).toBe(8192);
        expect(capturedPayload.generationConfig.responseMimeType).toBe('application/json');
        expect(capturedPayload.generationConfig.responseSchema).toBeDefined();
        expect(capturedPayload.generationConfig.responseSchema?.required).toEqual([
          'taskUnderstanding',
          'suggestedApproach',
          'suggestedMilestones',
          'requiredResources',
          'firstActionableStep',
        ]);
      }

      expect(plan.taskUnderstanding).toBe('Build a browser-based arithmetic calculator with keyboard support.');
      expect(plan.suggestedMilestones.length).toBe(3);
    });

    it('rejects attempts to generate plans using non-text/TTS models with descriptive capability error', async () => {
      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-3.8-flash-tts')
      ).rejects.toThrow(/does not support text execution plan generation.*unsupported model capability/i);
    });
  });

  describe('4. Thinking Parts Handling & Text Extraction', () => {
    it('skips thought parts and correctly extracts text part on thinking models', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      thought: true,
                      text: 'Thinking process: The user needs an execution plan for a calculator...',
                    },
                    {
                      text: validFiveSectionJson,
                    },
                  ],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        )
      );

      const plan = await provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.5-flash');
      expect(plan.taskUnderstanding).toBe('Build a browser-based arithmetic calculator with keyboard support.');
      expect(plan.firstActionableStep).toContain('Create arithmetic evaluation test file');
    });
  });

  describe('5. MAX_TOKENS Detection & Intelligent One-Time Recovery', () => {
    it('retries once with doubled token budget when candidate hits MAX_TOKENS and succeeds', async () => {
      let callCount = 0;
      const capturedBudgets: number[] = [];

      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        callCount++;
        const body = JSON.parse(init.body);
        capturedBudgets.push(body.generationConfig.maxOutputTokens);

        if (callCount === 1) {
          // Attempt 1: Incomplete truncated response with MAX_TOKENS finish reason
          return Promise.resolve(
            new Response(
              JSON.stringify({
                candidates: [
                  {
                    content: {
                      parts: [{ text: '{"taskUnderstanding": "Truncated json...' }],
                    },
                    finishReason: 'MAX_TOKENS',
                  },
                ],
                usageMetadata: {
                  candidatesTokenCount: 8192,
                },
              }),
              { status: 200 }
            )
          );
        }

        // Attempt 2 (Retry): Full response with 16384 token limit succeeds
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: validFiveSectionJson }],
                  },
                  finishReason: 'STOP',
                },
              ],
            }),
            { status: 200 }
          )
        );
      });

      const plan = await provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash');

      expect(callCount).toBe(2);
      expect(capturedBudgets[0]).toBe(8192);
      expect(capturedBudgets[1]).toBe(16384);
      expect(plan.taskUnderstanding).toBe('Build a browser-based arithmetic calculator with keyboard support.');
    });

    it('throws clear descriptive error when MAX_TOKENS persists across retry', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: '{"taskUnderstanding": "Truncated...' }],
                  },
                  finishReason: 'MAX_TOKENS',
                },
              ],
              usageMetadata: {
                candidatesTokenCount: 16384,
              },
            }),
            { status: 200 }
          )
        );
      });

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/Google Gemini exceeded maximum token limit \(MAX_TOKENS\)/i);
    });
  });

  describe('6. Strict 5-Section Validation (No Synthetic Fallbacks)', () => {
    it('rejects response missing Milestones without substituting synthetic fake data', async () => {
      const incompleteJson = JSON.stringify({
        taskUnderstanding: 'Some valid understanding of the problem',
        suggestedApproach: 'Some tactical approach',
        suggestedMilestones: [], // Empty milestones
        requiredResources: ['Resource 1'],
        firstActionableStep: 'Step 1',
      });

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: incompleteJson }],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/missing required execution plan sections: Execution Milestones/i);
    });

    it('rejects response missing First Actionable Step', async () => {
      const incompleteJson = JSON.stringify({
        taskUnderstanding: 'Some valid understanding of the problem',
        suggestedApproach: 'Some tactical approach',
        suggestedMilestones: [{ title: 'M1', description: 'D1', order: 1, isCriticalPath: true }],
        requiredResources: ['Resource 1'],
        firstActionableStep: '', // Missing step
      });

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: incompleteJson }],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/missing required execution plan sections: First Actionable Step/i);
    });
  });

  describe('7. Categorized Error Handling', () => {
    it('distinguishes Invalid API Key (401)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { status: 'UNAUTHENTICATED', message: 'API_KEY_INVALID' },
          }),
          { status: 401 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyInvalidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/Authentication failed. Invalid Google Gemini API key/i);
    });

    it('distinguishes Quota Exceeded (429 RESOURCE_EXHAUSTED)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for project' },
          }),
          { status: 429 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/Google Gemini quota exceeded \(RESOURCE_EXHAUSTED\)/i);
    });

    it('distinguishes Safety Blocked responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'SAFETY',
              },
            ],
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/Google Gemini safety filter blocked the response/i);
    });

    it('distinguishes Malformed JSON errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Here is some plain English plan that is not JSON at all.' }],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        )
      );

      await expect(
        provider.generatePlan(sampleContext, 'AIzaSyValidKey', undefined, 'gemini-2.0-flash')
      ).rejects.toThrow(/Failed to parse structured JSON/i);
    });
  });

  describe('8. Zero API Key Leakage Guarantee', () => {
    it('guarantees API key is not included in plan output or serialized errors', async () => {
      const secretKey = 'AIzaSySuperConfidentialSecretKey999';

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: validFiveSectionJson }],
                },
                finishReason: 'STOP',
              },
            ],
          }),
          { status: 200 }
        )
      );

      const plan = await provider.generatePlan(sampleContext, secretKey, undefined, 'gemini-2.0-flash');
      const serializedPlan = JSON.stringify(plan);

      expect(serializedPlan).not.toContain(secretKey);
      expect(serializedPlan).not.toContain('SuperConfidential');
    });
  });
});
