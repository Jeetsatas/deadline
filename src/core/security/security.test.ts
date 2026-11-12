import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMemoryCredentialStore } from './SessionMemoryCredentialStore';
import { maskApiKey, validateEndpointUrl } from './ICredentialStorage';

describe('Security Credential Storage Boundary', () => {
  let store: SessionMemoryCredentialStore;

  beforeEach(() => {
    store = new SessionMemoryCredentialStore();
  });

  it('stores and retrieves secrets strictly in memory', async () => {
    await store.saveSecret('ai_key_anthropic', 'sk-ant-api03-test-secret-key-12345');

    const retrieved = await store.getSecret('ai_key_anthropic');
    expect(retrieved).toBe('sk-ant-api03-test-secret-key-12345');
    expect(await store.hasSecret('ai_key_anthropic')).toBe(true);

    // Verify key deletion
    await store.clearSecret('ai_key_anthropic');
    expect(await store.getSecret('ai_key_anthropic')).toBeNull();
    expect(await store.hasSecret('ai_key_anthropic')).toBe(false);
  });

  it('correctly reports that backend vault is not available in frontend-only mode', () => {
    expect(store.isBackendVaultAvailable()).toBe(false);
  });

  it('clears all secrets on clearAll()', async () => {
    await store.saveSecret('key_1', 'secret_1');
    await store.saveSecret('key_2', 'secret_2');

    expect(await store.hasSecret('key_1')).toBe(true);
    expect(await store.hasSecret('key_2')).toBe(true);

    await store.clearAll();

    expect(await store.hasSecret('key_1')).toBe(false);
    expect(await store.hasSecret('key_2')).toBe(false);
  });

  it('masks API keys safely without exposing the secret body', () => {
    const masked = maskApiKey('sk-ant-api03-abcdefghijklmnop1234567890');
    expect(masked).toContain('••••••••');
    expect(masked).not.toContain('abcdefghijklmnop');
    expect(masked.endsWith('7890')).toBe(true);

    // Short keys are completely redacted
    expect(maskApiKey('12345')).toBe('••••••••');
    expect(maskApiKey('')).toBe('');
  });

  it('validates custom endpoint URLs against security constraints', () => {
    // Valid HTTPS
    expect(validateEndpointUrl('https://api.anthropic.com').valid).toBe(true);
    expect(validateEndpointUrl('https://my-proxy.company.internal/v1').valid).toBe(true);

    // Valid Localhost HTTP
    expect(validateEndpointUrl('http://localhost:11434/v1').valid).toBe(true);
    expect(validateEndpointUrl('http://127.0.0.1:8080/v1').valid).toBe(true);

    // Disallowed HTTP over non-localhost
    const insecureHttp = validateEndpointUrl('http://insecure-remote-api.com/v1');
    expect(insecureHttp.valid).toBe(false);
    expect(insecureHttp.error).toContain('HTTPS');

    // Invalid format
    const invalidFormat = validateEndpointUrl('not-a-valid-url');
    expect(invalidFormat.valid).toBe(false);
  });
});
