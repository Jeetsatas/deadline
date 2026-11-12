import { Deadline, DeliverableType } from '@/types';

export type AIProviderId = 'anthropic' | 'openai' | 'gemini' | 'openai_compatible' | 'custom';

export interface AIModelOption {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

export interface AIProviderMetadata {
  id: AIProviderId;
  name: string;
  description: string;
  defaultBaseUrl?: string;
  requiresBaseUrl?: boolean;
  availableModels: AIModelOption[];
  docsUrl?: string;
  isImplemented: boolean; // Indicates if fully operational in current phase
}

export interface AIProviderConfig {
  id: string; // e.g. 'cfg_anthropic'
  providerId: AIProviderId;
  name: string;
  baseUrl?: string;
  selectedModelId: string;
  isEnabled: boolean;
  isConfigured: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  model?: string;
  rawError?: string;
}

/**
 * Structured deadline context prepared for the AI provider.
 * Completely deliverable-independent.
 */
export interface AIContext {
  deadlineId: string;
  title: string;
  description: string;
  deliverableType: DeliverableType;
  expectedOutput: string;
  minimumAcceptableOutput?: string;
  executionApproach?: string;
  selectedPrototypeId?: string;
  priority: string;
  deadlineDate: string;
  deadlineTime: string;
  dueDateTime: string;
  milestones: {
    id: string;
    title: string;
    isCompleted: boolean;
    order: number;
  }[];
  referenceLinks: {
    title: string;
    url: string;
  }[];
  customInstructions?: string;
}

/**
 * AI-generated execution plan.
 * Distinct from user requirements; will not overwrite user inputs.
 */
export interface AIExecutionPlan {
  deadlineId: string;
  taskUnderstanding: string;
  suggestedApproach: string;
  suggestedMilestones: {
    title: string;
    description: string;
    order: number;
    isCriticalPath: boolean;
  }[];
  requiredResources: string[];
  firstActionableStep: string;
  deliverableSpecificGuidance: string; // Tailored for presentations, research papers, video, design, or code
  generatedAt: string;
  providerId: AIProviderId;
  modelId: string;
  rawPromptSummary?: string;
}

/**
 * Interface for concrete AI providers (Anthropic, OpenAI, etc.)
 */
export interface IAIProvider {
  readonly id: AIProviderId;
  readonly name: string;
  getMetadata(): AIProviderMetadata;
  testConnection(
    apiKey: string,
    baseUrl?: string,
    modelId?: string
  ): Promise<AIConnectionTestResult>;
  generatePlan(
    context: AIContext,
    apiKey: string,
    baseUrl?: string,
    modelId?: string
  ): Promise<AIExecutionPlan>;
}

/**
 * Interface for AI Provider Registry
 */
export interface IAIProviderRegistry {
  registerProvider(provider: IAIProvider): void;
  getProvider(id: AIProviderId): IAIProvider | undefined;
  listProviders(): IAIProvider[];
  hasProvider(id: AIProviderId): boolean;
}

/**
 * Interface for building deliverable-agnostic AI contexts & prompts
 */
export interface IAIContextBuilder {
  buildContext(deadline: Deadline, customInstructions?: string): AIContext;
  buildSystemPrompt(category: DeliverableType): string;
  buildUserPrompt(context: AIContext): string;
}

/**
 * Interface for AI Execution Service
 */
export interface IAIExecutionService {
  testConnection(
    providerId: AIProviderId,
    apiKey: string,
    baseUrl?: string,
    modelId?: string
  ): Promise<AIConnectionTestResult>;
  generateExecutionPlan(
    deadline: Deadline,
    providerId: AIProviderId,
    apiKey: string,
    baseUrl?: string,
    modelId?: string,
    customInstructions?: string
  ): Promise<AIExecutionPlan>;
}
