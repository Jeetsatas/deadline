import {
  IAIProvider,
  AIProviderMetadata,
  AIConnectionTestResult,
  AIContext,
  AIExecutionPlan,
} from '../types';

export class GeminiProvider implements IAIProvider {
  readonly id = 'gemini' as const;
  readonly name = 'Google Gemini';

  getMetadata(): AIProviderMetadata {
    return {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Gemini 2.0 Flash, Gemini 1.5 Pro with million-token context windows.',
      defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      requiresBaseUrl: false,
      docsUrl: 'https://ai.google.dev/gemini-api/docs',
      isImplemented: false, // Explicitly documented as interface specification (Phase 2 target)
      availableModels: [
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          description: 'Next-generation multimodal model with ultra-fast responsiveness.',
          contextWindow: 1000000,
          isDefault: true,
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          description: 'Long-context reasoning model for processing massive project briefs.',
          contextWindow: 2000000,
        },
      ],
    };
  }

  async testConnection(
    _apiKey: string,
    _baseUrl?: string,
    _modelId?: string
  ): Promise<AIConnectionTestResult> {
    return {
      success: false,
      message: 'Google Gemini adapter interface is scheduled for live implementation in Phase 2. Anthropic is currently the active functional provider.',
    };
  }

  async generatePlan(
    _context: AIContext,
    _apiKey: string,
    _baseUrl?: string,
    _modelId?: string
  ): Promise<AIExecutionPlan> {
    throw new Error('Gemini adapter execution is scheduled for Phase 2. Please use Anthropic for active AI execution planning.');
  }
}
