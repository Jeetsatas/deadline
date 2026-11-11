/**
 * Extensible Prototype Module Architecture
 *
 * Prepared for future prototype category specifications without hardcoding fixed definitions.
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

export interface IPrototypeRegistry {
  registerCategory(descriptor: PrototypeCategoryDescriptor): void;
  getCategory(categoryId: string): PrototypeCategoryDescriptor | undefined;
  listCategories(): PrototypeCategoryDescriptor[];
  isRegistered(categoryId: string): boolean;
}

class DefaultPrototypeRegistry implements IPrototypeRegistry {
  private categories: Map<string, PrototypeCategoryDescriptor> = new Map();

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
