import {
  IAIProvider,
  AIProviderMetadata,
  AIConnectionTestResult,
  AIContext,
  AIExecutionPlan,
} from '../types';

export class OpenAICompatibleProvider implements IAIProvider {
  readonly id = 'openai_compatible' as const;
  readonly name = 'OpenAI-Compatible (Ollama, vLLM, OpenRouter)';

  getMetadata(): AIProviderMetadata {
    return {
      id: 'openai_compatible',
      name: 'OpenAI-Compatible Endpoint',
      description: 'Connect local or custom endpoints such as Ollama, vLLM, LocalAI, or OpenRouter.',
      defaultBaseUrl: 'http://localhost:11434/v1',
      requiresBaseUrl: true,
      docsUrl: 'https://ollama.com/',
      isImplemented: false, // Scheduled for Phase 2
      availableModels: [
        {
          id: 'custom-model',
          name: 'Custom Endpoint Model',
          description: 'Model hosted on your local or remote compatible server.',
          isDefault: true,
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
      message: 'Custom compatible endpoints are scheduled for live testing in Phase 2. Anthropic is currently the active functional provider.',
    };
  }

  async generatePlan(
    _context: AIContext,
    _apiKey: string,
    _baseUrl?: string,
    _modelId?: string
  ): Promise<AIExecutionPlan> {
    throw new Error('Compatible provider execution is scheduled for Phase 2. Please use Anthropic for active AI execution planning.');
  }
}

