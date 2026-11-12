import { Deadline } from '@/types';
import {
  AIProviderId,
  AIConnectionTestResult,
  AIExecutionPlan,
  IAIExecutionService,
} from './types';
import { aiProviderRegistry } from './AIProviderRegistry';
import { aiContextBuilder } from './AIContextBuilder';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';

export class DefaultAIExecutionService implements IAIExecutionService {
  async testConnection(
    providerId: AIProviderId,
    apiKey: string,
    baseUrl?: string,
    modelId?: string
  ): Promise<AIConnectionTestResult> {
    const provider = aiProviderRegistry.getProvider(providerId);
    if (!provider) {
      return {
        success: false,
        message: `Provider "${providerId}" is not registered.`,
      };
    }

    return provider.testConnection(apiKey, baseUrl, modelId);
  }

  async generateExecutionPlan(
    deadline: Deadline,
    providerId: AIProviderId,
    apiKey?: string,
    baseUrl?: string,
    modelId?: string,
    customInstructions?: string
  ): Promise<AIExecutionPlan> {
    const provider = aiProviderRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`AI Provider "${providerId}" is not registered.`);
    }

    // Retrieve API key from in-memory credential storage if not explicitly passed
    let effectiveKey = apiKey;
    if (!effectiveKey) {
      const storedKey = await credentialStorage.getSecret(`ai_key_${providerId}`);
      if (storedKey) {
        effectiveKey = storedKey;
      }
    }

    if (!effectiveKey) {
      throw new Error(
        `No API key found for ${provider.name}. Please enter your API key in Settings > AI Integrations.`
      );
    }

    const context = aiContextBuilder.buildContext(deadline, customInstructions);
    return provider.generatePlan(context, effectiveKey, baseUrl, modelId);
  }
}

export const aiExecutionService = new DefaultAIExecutionService();
