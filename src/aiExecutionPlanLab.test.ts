import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiExecutionService } from './core/ai/AIExecutionService';
import { credentialStorage } from './core/security/SessionMemoryCredentialStore';
import { Deadline } from './types';

describe('AI Execution Plan Generation Suite (Google Gemini)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await credentialStorage.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const sampleCalculatorDeadline: Deadline = {
    id: 'dl_calc_lab_test',
    title: 'Build a Calculator Application',
    description: 'Build a responsive calculator application with full keyboard support and arithmetic engine.',
    expectedOutput: 'A fully working calculator application.',
    minimumAcceptableOutput: 'Basic arithmetic calculator.',
    priority: 'high',
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
    tags: ['calculator', 'gemini'],
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  };

  it('generates real structured execution plan from Gemini API response', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  taskUnderstanding: 'Develop a responsive, fully functional browser-based calculator capable of arithmetic and edge-case handling.',
                  suggestedApproach: 'Prototype-first: Implement the calculation parser with unit tests, then build a clean responsive UI and connect events.',
                  suggestedMilestones: [
                    {
                      title: 'Core Calculation Logic',
                      description: 'Build and unit-test arithmetic evaluation parser including operator precedence.',
                      order: 1,
                      isCriticalPath: true,
                    },
                    {
                      title: 'Interactive Keypad & Display UI',
                      description: 'Implement layout, button states, and keyboard shortcut event listeners.',
                      order: 2,
                      isCriticalPath: true,
                    },
                    {
                      title: 'Production Build & Acceptance Testing',
                      description: 'Verify divide-by-zero, decimal precision, and deploy working prototype.',
                      order: 3,
                      isCriticalPath: true,
                    },
                  ],
                  requiredResources: ['React + TypeScript', 'Vite', 'Vitest'],
                  firstActionableStep: 'Create arithmetic evaluation test file and verify add, subtract, multiply, and divide operations.',
                  deliverableSpecificGuidance: 'Ensure division by zero displays "Error" and does not crash the UI.',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    };

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockGeminiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_real_test_key_12345');

    const plan = await aiExecutionService.generateExecutionPlan(
      sampleCalculatorDeadline,
      'gemini',
      undefined,
      undefined,
      'gemini-2.0-flash'
    );

    expect(plan).toBeDefined();
    expect(plan.providerId).toBe('gemini');
    expect(plan.modelId).toBe('gemini-2.0-flash');
    expect(plan.taskUnderstanding).toContain('calculator');
    expect(plan.suggestedApproach).toContain('Prototype-first');
    expect(plan.suggestedMilestones.length).toBe(3);
    expect(plan.suggestedMilestones[0].title).toBe('Core Calculation Logic');
    expect(plan.suggestedMilestones[0].isCriticalPath).toBe(true);
    expect(plan.requiredResources).toContain('React + TypeScript');
    expect(plan.firstActionableStep).toContain('arithmetic');
    expect(plan.deliverableSpecificGuidance).toBeTruthy();
    expect(plan.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('correctly parses markdown-fenced json response from Gemini', async () => {
    const fencedJson = '```json\n{\n  "taskUnderstanding": "Calculator app with basic arithmetic",\n  "suggestedApproach": "Build core engine then UI",\n  "suggestedMilestones": [{"title": "Engine", "description": "Core logic", "order": 1, "isCriticalPath": true}],\n  "requiredResources": ["TypeScript"],\n  "firstActionableStep": "Scaffold math logic",\n  "deliverableSpecificGuidance": "Check precision"\n}\n```';

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: fencedJson }] } }],
        }),
        { status: 200 }
      );

    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_real_key_fenced');

    const plan = await aiExecutionService.generateExecutionPlan(
      sampleCalculatorDeadline,
      'gemini',
      undefined,
      undefined,
      'gemini-2.5-flash'
    );

    expect(plan.taskUnderstanding).toBe('Calculator app with basic arithmetic');
    expect(plan.modelId).toBe('gemini-2.5-flash');
    expect(plan.suggestedMilestones.length).toBe(1);
    expect(plan.firstActionableStep).toBe('Scaffold math logic');
  });

  it('throws descriptive error on HTTP 404 model not found without falling back to mock plan', async () => {
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

    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_real_key_not_found');

    await expect(
      aiExecutionService.generateExecutionPlan(
        sampleCalculatorDeadline,
        'gemini',
        undefined,
        undefined,
        'gemini-non-existent'
      )
    ).rejects.toThrow(/The selected model is no longer available for this API key|not found/i);
  });

  it('throws descriptive error on HTTP 429 quota exhausted without using mock data', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
        { status: 429, statusText: 'Too Many Requests' }
      );

    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_real_key_quota');

    await expect(
      aiExecutionService.generateExecutionPlan(
        sampleCalculatorDeadline,
        'gemini',
        undefined,
        undefined,
        'gemini-2.0-flash'
      )
    ).rejects.toThrow(/RESOURCE_EXHAUSTED|quota or rate limit/i);
  });

  it('throws descriptive error on invalid API key without using mock data', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 401,
            message: 'API_KEY_INVALID',
            status: 'UNAUTHENTICATED',
          },
        }),
        { status: 401, statusText: 'Unauthorized' }
      );

    await credentialStorage.saveSecret('ai_key_gemini', 'AIzaSy_invalid_key_123');

    await expect(
      aiExecutionService.generateExecutionPlan(
        sampleCalculatorDeadline,
        'gemini',
        undefined,
        undefined,
        'gemini-2.0-flash'
      )
    ).rejects.toThrow(/Authentication failed|API key/i);
  });
});
