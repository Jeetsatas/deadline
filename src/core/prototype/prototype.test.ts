import { describe, it, expect } from 'vitest';
import { prototypeRegistry } from './index';

describe('PrototypeRegistry', () => {
  it('registers and retrieves prototype category descriptors', () => {
    const testCategory = {
      categoryId: 'test_calculator',
      label: 'Interactive Calculator Spec',
      description: 'Calculator functional prototype category',
      supportedFormats: ['url', 'repository'],
    };

    prototypeRegistry.registerCategory(testCategory);

    expect(prototypeRegistry.isRegistered('test_calculator')).toBe(true);
    const retrieved = prototypeRegistry.getCategory('test_calculator');
    expect(retrieved?.label).toBe('Interactive Calculator Spec');
    expect(retrieved?.supportedFormats).toEqual(['url', 'repository']);
  });

  it('returns undefined for non-existent category', () => {
    expect(prototypeRegistry.getCategory('unknown_xyz')).toBeUndefined();
  });
});
