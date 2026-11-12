import { AIProviderId, IAIProvider, IAIProviderRegistry } from './types';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';

export class DefaultAIProviderRegistry implements IAIProviderRegistry {
  private providers = new Map<AIProviderId, IAIProvider>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAICompatibleProvider());
  }

  registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: AIProviderId): IAIProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  hasProvider(id: AIProviderId): boolean {
    return this.providers.has(id);
  }

  clear(): void {
    this.providers.clear();
  }

  resetToDefaults(): void {
    this.clear();
    this.registerDefaults();
  }
}

export const aiProviderRegistry = new DefaultAIProviderRegistry();

