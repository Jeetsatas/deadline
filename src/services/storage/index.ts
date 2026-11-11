import { IStorageAdapter } from './StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';

/**
 * Storage Service Factory
 *
 * Current implementation uses LocalStorageAdapter.
 * In a future phase, this can be swapped with SupabaseStorageAdapter or PostgresAdapter
 * by reading an environment variable or config without touching the UI layer.
 */

export const storageService: IStorageAdapter = new LocalStorageAdapter();

export * from './StorageAdapter';
export * from './LocalStorageAdapter';
