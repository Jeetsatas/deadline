import { IIDEAdapter, IDEProviderId, IDEProviderMetadata } from './types';
import { ClaudeCodeAdapter } from './adapters/ClaudeCodeAdapter';
import { CodexAdapter } from './adapters/CodexAdapter';
import { AntigravityAdapter } from './adapters/AntigravityAdapter';
import { CursorAdapter } from './adapters/CursorAdapter';
import { VSCodeAdapter } from './adapters/VSCodeAdapter';
import { WindsurfAdapter } from './adapters/WindsurfAdapter';

export class IDEProviderRegistry {
  private providers: Map<IDEProviderId, IIDEAdapter> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  /**
   * Registers the 6 first-class IDE integrations equally without favoritism.
   */
  private registerDefaultProviders(): void {
    this.registerProvider(new ClaudeCodeAdapter());
    this.registerProvider(new CodexAdapter());
    this.registerProvider(new CursorAdapter());
    this.registerProvider(new AntigravityAdapter());
    this.registerProvider(new VSCodeAdapter());
    this.registerProvider(new WindsurfAdapter());
  }

  /**
   * Registers a provider adapter into the registry.
   */
  registerProvider(adapter: IIDEAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  /**
   * Retrieves an adapter by its identifier.
   */
  getProvider(id: IDEProviderId): IIDEAdapter | undefined {
    return this.providers.get(id);
  }

  /**
   * Returns list of all registered provider adapters.
   */
  listProviders(): IIDEAdapter[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns metadata for all registered providers.
   */
  listMetadata(): IDEProviderMetadata[] {
    return this.listProviders().map((p) => p.metadata);
  }

  /**
   * Checks if a provider exists in registry.
   */
  hasProvider(id: IDEProviderId): boolean {
    return this.providers.has(id);
  }
}

export const ideProviderRegistry = new IDEProviderRegistry();

