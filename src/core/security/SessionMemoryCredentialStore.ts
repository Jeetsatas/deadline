import { ICredentialStorage } from './ICredentialStorage';

/**
 * SessionMemoryCredentialStore
 *
 * Implements ICredentialStorage strictly in volatile browser memory.
 * Secrets are never written to LocalStorage, SessionStorage, cookies, or IndexedDB.
 *
 * When the user closes or reloads the tab, all secrets vanish from memory.
 * This guarantees zero accidental persistence, zero inclusion in backup exports,
 * and zero disk leakage on shared or public machines.
 */
export class SessionMemoryCredentialStore implements ICredentialStorage {
  private secrets = new Map<string, string>();

  async saveSecret(key: string, secret: string): Promise<void> {
    if (!key) return;
    if (!secret || !secret.trim()) {
      this.secrets.delete(key);
      return;
    }
    this.secrets.set(key, secret.trim());
  }

  async getSecret(key: string): Promise<string | null> {
    return this.secrets.get(key) || null;
  }

  async hasSecret(key: string): Promise<boolean> {
    return this.secrets.has(key);
  }

  async clearSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }

  async clearAll(): Promise<void> {
    this.secrets.clear();
  }

  isBackendVaultAvailable(): boolean {
    // Current frontend-only limitation. Will be true when a secure backend or local companion daemon is connected.
    return false;
  }
}

// Export singleton instance for the application runtime
export const credentialStorage = new SessionMemoryCredentialStore();

