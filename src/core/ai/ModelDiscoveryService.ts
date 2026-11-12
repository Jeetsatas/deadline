import {
  AIProviderId,
  AIModelMetadata,
  ModelDiscoveryResult,
  IModelDiscoveryService,
} from './types';
import { aiProviderRegistry } from './AIProviderRegistry';

export class ModelDiscoveryService implements IModelDiscoveryService {
  /**
   * Normalizes model ID by trimming and removing any leading 'models/' prefix.
   */
  private normalizeModelId(modelId?: string): string {
    if (!modelId) return '';
    return modelId.trim().replace(/^models\//i, '');
  }

  /**
   * Discovers available models for a given AI provider using the provided API key.
   */
  async discoverModels(
    providerId: AIProviderId,
    apiKey: string,
    baseUrl?: string
  ): Promise<ModelDiscoveryResult> {
    const key = apiKey?.trim() || '';
    const nowIso = new Date().toISOString();

    if (!key) {
      return {
        success: false,
        models: [],
        provider: providerId,
        discoveredAt: nowIso,
        status: 'no_key',
        errorMessage: `Please enter an API key for ${providerId} to discover available models.`,
      };
    }

    const provider = aiProviderRegistry.getProvider(providerId);
    if (!provider) {
      return {
        success: false,
        models: [],
        provider: providerId,
        discoveredAt: nowIso,
        status: 'network_error',
        errorMessage: `Provider "${providerId}" is not registered in AI Provider Registry.`,
      };
    }

    // If provider implements dedicated discoverModels method, delegate to it
    if (typeof provider.discoverModels === 'function') {
      try {
        return await provider.discoverModels(key, baseUrl);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          models: [],
          provider: providerId,
          discoveredAt: nowIso,
          status: 'network_error',
          rawError: errMsg,
          errorMessage: `Model discovery failed for ${provider.name}: ${errMsg}`,
        };
      }
    }

    // Fallback: If provider defines static availableModels in metadata (e.g. Anthropic/OpenAI)
    const metadata = provider.getMetadata();
    const staticModels = metadata.availableModels || [];

    const mapped: AIModelMetadata[] = staticModels.map((opt) => ({
      id: this.normalizeModelId(opt.id),
      displayName: opt.name,
      description: opt.description,
      provider: providerId,
      supportedCapabilities: ['generateContent'],
      inputTokenLimit: opt.contextWindow,
      outputTokenLimit: 4096,
      isAvailable: true,
    }));

    return {
      success: mapped.length > 0,
      models: mapped,
      provider: providerId,
      discoveredAt: nowIso,
      status: mapped.length > 0 ? 'models_loaded' : 'no_compatible_models',
      errorMessage: mapped.length === 0 ? 'No compatible models found for this provider.' : undefined,
    };
  }

  /**
   * Validates whether a specific model is currently available and supports generation.
   */
  async validateModelAvailability(
    providerId: AIProviderId,
    modelId: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<boolean> {
    const cleanId = this.normalizeModelId(modelId);
    if (!cleanId) return false;

    const result = await this.discoverModels(providerId, apiKey, baseUrl);
    if (!result.success || !Array.isArray(result.models)) {
      return false;
    }

    return result.models.some((m) => m.id.toLowerCase() === cleanId.toLowerCase() && m.isAvailable);
  }
}

export const modelDiscoveryService = new ModelDiscoveryService();
