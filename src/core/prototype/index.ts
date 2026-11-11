import { DeliverableType } from '@/types';

/**
 * Extensible Prototype Module Architecture
 *
 * Prepared for future prototype category specifications without hardcoding fixed definitions.
 * Follows a dynamic registry pattern allowing types to be registered, configured, and selected.
 */

export interface PrototypeMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  sourceUri?: string;
  previewSupported?: boolean;
  customAttributes?: Record<string, unknown>;
}

export interface PrototypeCategoryDescriptor {
  categoryId: string;
  label: string;
  description: string;
  iconName?: string;
  supportedFormats: string[];
  validator?: (data: unknown) => { valid: boolean; errors?: string[] };
}

export interface PrototypeConfigOption {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'select' | 'number';
  defaultValue?: unknown;
  description?: string;
  options?: { label: string; value: string }[];
}

export interface PrototypeTypeDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  badge?: string;
  supportedDeliverables?: DeliverableType[];
  configSchema?: PrototypeConfigOption[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface IPrototypeRegistry {
  // Prototype Type Definition APIs
  registerType(type: PrototypeTypeDefinition): void;
  unregisterType(id: string): void;
  getType(id: string): PrototypeTypeDefinition | undefined;
  listTypes(filter?: { enabledOnly?: boolean; deliverableType?: DeliverableType }): PrototypeTypeDefinition[];
  enableType(id: string): void;
  disableType(id: string): void;
  hasType(id: string): boolean;
  clear(): void;

  // Backward-compatible category APIs
  registerCategory(descriptor: PrototypeCategoryDescriptor): void;
  getCategory(categoryId: string): PrototypeCategoryDescriptor | undefined;
  listCategories(): PrototypeCategoryDescriptor[];
  isRegistered(categoryId: string): boolean;
}

class DefaultPrototypeRegistry implements IPrototypeRegistry {
  private types: Map<string, PrototypeTypeDefinition> = new Map();
  private categories: Map<string, PrototypeCategoryDescriptor> = new Map();

  // Type APIs
  registerType(type: PrototypeTypeDefinition): void {
    this.types.set(type.id, {
      ...type,
      enabled: type.enabled !== undefined ? type.enabled : true,
      createdAt: type.createdAt || new Date().toISOString(),
    });
  }

  unregisterType(id: string): void {
    this.types.delete(id);
  }

  getType(id: string): PrototypeTypeDefinition | undefined {
    return this.types.get(id);
  }

  listTypes(filter?: { enabledOnly?: boolean; deliverableType?: DeliverableType }): PrototypeTypeDefinition[] {
    let result = Array.from(this.types.values());

    if (filter?.enabledOnly) {
      result = result.filter((t) => t.enabled);
    }

    if (filter?.deliverableType) {
      result = result.filter(
        (t) => !t.supportedDeliverables || t.supportedDeliverables.length === 0 || t.supportedDeliverables.includes(filter.deliverableType!)
      );
    }

    return result;
  }

  enableType(id: string): void {
    const existing = this.types.get(id);
    if (existing) {
      this.types.set(id, { ...existing, enabled: true });
    }
  }

  disableType(id: string): void {
    const existing = this.types.get(id);
    if (existing) {
      this.types.set(id, { ...existing, enabled: false });
    }
  }

  hasType(id: string): boolean {
    return this.types.has(id);
  }

  clear(): void {
    this.types.clear();
    this.categories.clear();
  }

  // Category APIs
  registerCategory(descriptor: PrototypeCategoryDescriptor): void {
    this.categories.set(descriptor.categoryId, descriptor);
  }

  getCategory(categoryId: string): PrototypeCategoryDescriptor | undefined {
    return this.categories.get(categoryId);
  }

  listCategories(): PrototypeCategoryDescriptor[] {
    return Array.from(this.categories.values());
  }

  isRegistered(categoryId: string): boolean {
    return this.categories.has(categoryId);
  }
}

// Singleton registry instance ready for future extension
export const prototypeRegistry: IPrototypeRegistry = new DefaultPrototypeRegistry();
