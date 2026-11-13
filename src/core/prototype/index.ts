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

/**
 * Optional future execution adapter interface.
 * Allows future prototype generators or execution agents to hook in
 * without refactoring the registry.
 */
export interface IPrototypeExecutionAdapter {
  adapterId: string;
  name: string;
  version?: string;
  prepare?(config?: Record<string, unknown>): Promise<{ ready: boolean; instructions?: string }>;
  validateSubmission?(resourceUri: string, config?: Record<string, unknown>): Promise<{ valid: boolean; message?: string }>;
}

export interface PrototypeTypeDefinition {
  id: string; // Unique prototype identifier
  name: string; // Display name
  description: string; // Plain-language description
  enabled: boolean; // Enable/disable toggle
  badge?: string; // Visual badge (e.g. 'Interactive', 'CLI', 'Component')
  supportedDeliverables?: DeliverableType[]; // Filtered by selected deliverable category
  configSchema?: PrototypeConfigOption[]; // Configuration schema
  executionAdapter?: IPrototypeExecutionAdapter; // Optional future execution adapter
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface IPrototypeRegistry {
  // Prototype Type Definition APIs
  registerType(type: PrototypeTypeDefinition): void;
  unregisterType(id: string): void;
  getType(id: string): PrototypeTypeDefinition | undefined;
  listTypes(filter?: { enabledOnly?: boolean; deliverableType?: DeliverableType }): PrototypeTypeDefinition[];
  discover(filter?: { deliverableType?: DeliverableType; query?: string }): PrototypeTypeDefinition[];
  enableType(id: string): void;
  disableType(id: string): void;
  hasType(id: string): boolean;
  initializeDefaults?(): void;
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
        (t) =>
          !t.supportedDeliverables ||
          t.supportedDeliverables.length === 0 ||
          t.supportedDeliverables.includes(filter.deliverableType!)
      );
    }

    return result;
  }

  discover(filter?: { deliverableType?: DeliverableType; query?: string }): PrototypeTypeDefinition[] {
    let result = this.listTypes({ enabledOnly: true, deliverableType: filter?.deliverableType });

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
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

  initializeDefaults(): void {
    const defaults: PrototypeTypeDefinition[] = [
      {
        id: 'interactive-calc-proto',
        name: 'Interactive Calculator Blueprint',
        description: 'Single-page lightweight prototype scaffold for calculator applications with state persistence.',
        enabled: true,
        badge: 'Interactive',
        supportedDeliverables: ['software', 'prototype', 'assignment'],
        configSchema: [
          {
            key: 'engine',
            label: 'Math Engine',
            type: 'select',
            options: [
              { label: 'Vanilla JS Math', value: 'vanilla' },
              { label: 'BigNumber precision', value: 'bignumber' },
            ],
          },
        ],
        metadata: { author: 'Deadline Core', version: '1.0.0' },
      },
      {
        id: 'react-app-proto',
        name: 'Modern Web Application Scaffold',
        description: 'Single-Page Application prototype with component state, responsive layouts, and unit tests.',
        enabled: true,
        badge: 'Component UI',
        supportedDeliverables: ['software', 'prototype'],
        metadata: { author: 'Deadline Core', version: '1.0.0' },
      },
      {
        id: 'slide-deck-proto',
        name: 'Keynote Slide Deck Scaffold',
        description: 'Structured visual outline for milestone reviews, stakeholder demonstrations, and defense presentations.',
        enabled: true,
        badge: 'Slide Deck',
        supportedDeliverables: ['presentation', 'assignment'],
        metadata: { author: 'Deadline Core', version: '1.0.0' },
      },
    ];

    for (const def of defaults) {
      if (!this.types.has(def.id)) {
        this.registerType(def);
      }
    }
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
const defaultRegistry = new DefaultPrototypeRegistry();
defaultRegistry.initializeDefaults();
export const prototypeRegistry: IPrototypeRegistry = defaultRegistry;
