import {
  IAIProvider,
  AIProviderMetadata,
  AIConnectionTestResult,
  AIContext,
  AIExecutionPlan,
} from '../types';

export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai' as const;
  readonly name = 'OpenAI';

  getMetadata(): AIProviderMetadata {
    return {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4o, GPT-4o-mini, and o3 reasoning models for execution planning.',
      defaultBaseUrl: 'https://api.openai.com/v1',
      requiresBaseUrl: false,
      docsUrl: 'https://platform.openai.com/docs/quickstart',
      isImplemented: false, // Explicitly documented as interface specification (Phase 2 target)
      availableModels: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: 'Flagship multimodal model for complex reasoning and planning.',
          contextWindow: 128000,
          isDefault: true,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o mini',
          description: 'Fast, lightweight model for rapid task decomposition.',
          contextWindow: 128000,
        },
        {
          id: 'o3-mini',
          name: 'o3-mini',
          description: 'Specialized reasoning model for deep logic & code analysis.',
          contextWindow: 128000,
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
      message: 'OpenAI provider adapter is scheduled for full live implementation in Phase 2. Anthropic is currently the active functional provider.',
    };
  }

  async generatePlan(
    _context: AIContext,
    _apiKey: string,
    _baseUrl?: string,
    _modelId?: string
  ): Promise<AIExecutionPlan> {
    throw new Error('OpenAI provider execution adapter is scheduled for Phase 2. Please use Anthropic for active AI execution planning.');
  }
}

