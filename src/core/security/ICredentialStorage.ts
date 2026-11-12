/**
 * Credential Storage Interface
 *
 * Provides a strict boundary between application state and secret credentials.
 * Ensures API keys and auth tokens are never stored in LocalStorage,
 * never logged, and never included in project JSON exports.
 */
export interface ICredentialStorage {
  /**
   * Save a secret associated with a key identifier (e.g. 'ai_key_anthropic').
   */
  saveSecret(key: string, secret: string): Promise<void>;

  /**
   * Retrieve a secret. Returns null if not found.
   */
  getSecret(key: string): Promise<string | null>;

  /**
   * Check whether a secret exists without reading its value.
   */
  hasSecret(key: string): Promise<boolean>;

  /**
   * Remove a secret.
   */
  clearSecret(key: string): Promise<void>;

  /**
   * Remove all secrets.
   */
  clearAll(): Promise<void>;

  /**
   * Returns false in the current frontend-only prototype.
   * Will return true when a secure backend or local OS vault bridge is active.
   */
  isBackendVaultAvailable(): boolean;
}

/**
 * Mask an API key for safe UI display (e.g. sk-ant-••••••••8f2a).
 * Never exposes the full secret.
 */
export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, Math.min(8, Math.floor(trimmed.length / 4)));
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Validates that an endpoint URL uses an allowed protocol (https or localhost http)
 * and is a valid URL, preventing SSRF or protocol injection.
 */
export function validateEndpointUrl(urlStr?: string): { valid: boolean; error?: string } {
  if (!urlStr || !urlStr.trim()) return { valid: true };
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol === 'https:') {
      return { valid: true };
    }
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return { valid: true };
    }
    return {
      valid: false,
      error: 'Endpoint URL must use HTTPS, or HTTP on localhost.',
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format.',
    };
  }
}

