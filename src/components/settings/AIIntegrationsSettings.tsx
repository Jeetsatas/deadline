import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { aiProviderRegistry } from '@/core/ai/AIProviderRegistry';
import {
  AIProviderId,
  AIProviderMetadata,
  AIConnectionTestResult,
  AIModelMetadata,
  IAIProvider,
} from '@/core/ai/types';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Cpu,
  Trash2,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';

export const AIIntegrationsSettings: React.FC = () => {
  const {
    configuredProviders,
    discoveredModels,
    modelDiscoveryStatus,
    isDiscoveringModels,
    saveProviderConfig,
    removeProviderConfig,
    testProviderConnection,
    discoverProviderModels,
    getMaskedApiKey,
  } = useDeadlineStore();

  const providers = useMemo(() => aiProviderRegistry.listProviders(), []);

  // Local editing states per provider
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, AIConnectionTestResult | null>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  // Helper to trigger discovery on explicit user action
  const runModelDiscovery = useCallback(
    async (providerId: AIProviderId, key?: string) => {
      let keyToUse = key?.trim();
      if (!keyToUse) {
        const stored = await credentialStorage.getSecret(`ai_key_${providerId}`);
        if (stored) keyToUse = stored;
      }
      if (!keyToUse) return;

      const baseUrl = baseUrls[providerId] || configuredProviders[providerId]?.baseUrl;
      await discoverProviderModels(providerId, keyToUse, baseUrl);
    },
    [baseUrls, configuredProviders, discoverProviderModels]
  );

  // Load existing masked keys on mount
  useEffect(() => {
    let isMounted = true;
    const loadKeys = async () => {
      const masks: Record<string, string> = {};
      for (const p of providers) {
        const masked = await getMaskedApiKey(p.id);
        if (masked) masks[p.id] = masked;
      }
      if (isMounted) {
        setMaskedKeys(masks);
      }
    };

    loadKeys();
    return () => {
      isMounted = false;
    };
  }, [getMaskedApiKey, providers]);

  // Synchronize form models and base URLs from configuredProviders / discoveredModels safely
  useEffect(() => {
    setSelectedModels((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of providers) {
        if (!next[p.id]) {
          const config = configuredProviders[p.id];
          const discovered = discoveredModels[p.id] || [];
          const staticFallback = p.getMetadata().availableModels;
          const defaultModelId =
            config?.selectedModelId ||
            discovered.find((m) => m.id.includes('2.0-flash'))?.id ||
            discovered[0]?.id ||
            staticFallback.find((m) => m.isDefault)?.id ||
            staticFallback[0]?.id ||
            '';

          if (defaultModelId) {
            next[p.id] = defaultModelId;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });

    setBaseUrls((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of providers) {
        if (next[p.id] === undefined) {
          const config = configuredProviders[p.id];
          next[p.id] = config?.baseUrl || p.getMetadata().defaultBaseUrl || '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [configuredProviders, discoveredModels, providers]);

  const handleTest = async (providerId: AIProviderId) => {
    setTestingId(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    const key = apiKeys[providerId] || '';
    const baseUrl = baseUrls[providerId];
    const modelId = selectedModels[providerId];

    const result = await testProviderConnection(providerId, key, baseUrl, modelId);
    setTestResults((prev) => ({ ...prev, [providerId]: result }));
    setTestingId(null);

    // If test connection succeeded and key was valid, also discover live models
    if (result.success) {
      await runModelDiscovery(providerId, key);
    }
  };

  const handleRefreshModels = async (provider: IAIProvider) => {
    const key = apiKeys[provider.id] || '';
    const stored = await credentialStorage.getSecret(`ai_key_${provider.id}`);
    const effectiveKey = key.trim() || stored;

    if (!effectiveKey) {
      alert(`Please enter an API key for ${provider.name} first to discover available models.`);
      return;
    }

    await runModelDiscovery(provider.id, effectiveKey);
  };

  const handleSave = async (metadata: AIProviderMetadata) => {
    const key = apiKeys[metadata.id];
    const providerDiscovered = discoveredModels[metadata.id] || [];
    const fallbackStatic = metadata.availableModels;

    const modelId =
      selectedModels[metadata.id] ||
      providerDiscovered[0]?.id ||
      fallbackStatic[0]?.id ||
      '';
    const baseUrl = baseUrls[metadata.id] || metadata.defaultBaseUrl;

    await saveProviderConfig(
      {
        id: `cfg_${metadata.id}`,
        providerId: metadata.id,
        name: metadata.name,
        baseUrl,
        selectedModelId: modelId,
        isEnabled: true,
        isConfigured: true,
      },
      key
    );

    // If a key was provided in input, trigger discovery immediately
    if (key?.trim()) {
      await runModelDiscovery(metadata.id, key);
    }

    // Refresh masked display
    const masked = await getMaskedApiKey(metadata.id);
    setMaskedKeys((prev) => ({ ...prev, [metadata.id]: masked }));
    // Clear plaintext from form state
    setApiKeys((prev) => ({ ...prev, [metadata.id]: '' }));

    setSaveSuccess((prev) => ({ ...prev, [metadata.id]: true }));
    setTimeout(() => {
      setSaveSuccess((prev) => ({ ...prev, [metadata.id]: false }));
    }, 2500);
  };

  const handleRemove = async (providerId: AIProviderId) => {
    if (confirm(`Remove configuration for ${providerId}? This will remove credentials from memory.`)) {
      await removeProviderConfig(providerId);
      setMaskedKeys((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Informative Security Notice */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground text-sm">
            Session-Only Credential Security Boundary
          </h4>
          <p className="text-muted-foreground">
            In this early-stage frontend prototype, API keys are held strictly in temporary browser memory.
            Keys are <strong className="text-foreground">never saved to LocalStorage</strong>, never written to disk,
            and <strong className="text-foreground">never included in JSON exports</strong>.
            Because keys remain in memory only, you will need to re-enter them if you reload or reopen the application.
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono pt-0.5">
            Phase 3 will introduce an encrypted local companion bridge and backend credential vault.
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const metadata = provider.getMetadata();
          const config = configuredProviders[metadata.id];
          const isConfigured = Boolean(config?.isConfigured);
          const hasKey = Boolean(maskedKeys[metadata.id]);
          const testRes = testResults[metadata.id];
          const isTesting = testingId === metadata.id;
          const isAnthropic = metadata.id === 'anthropic';
          const isGemini = metadata.id === 'gemini';

          // Discovered models from API
          const liveDiscovered: AIModelMetadata[] = discoveredModels[metadata.id] || [];
          const discoveryInfo = modelDiscoveryStatus[metadata.id];
          const isFetchingModels = isDiscoveringModels[metadata.id] || false;

          // Model list to display:
          // For Gemini: strictly live discovered models (no hardcoded fallback)
          // For other providers: live discovered or metadata static list
          const availableModels: { id: string; name: string; description?: string; isDefault?: boolean }[] =
            liveDiscovered.length > 0
              ? liveDiscovered.map((m) => ({
                  id: m.id,
                  name: m.displayName,
                  description: m.description,
                  isDefault: m.id.includes('2.0-flash'),
                }))
              : isGemini
              ? []
              : metadata.availableModels;

          const currentSelected = selectedModels[metadata.id] || config?.selectedModelId || '';
          const isSelectedModelUnavailable =
            liveDiscovered.length > 0 &&
            Boolean(currentSelected) &&
            !liveDiscovered.some((m) => m.id.toLowerCase() === currentSelected.toLowerCase());

          return (
            <div
              key={metadata.id}
              className={`p-5 rounded-xl border bg-card shadow-sm transition-all space-y-4 ${
                isConfigured
                  ? 'border-primary/40 ring-1 ring-primary/20'
                  : 'border-border'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isAnthropic
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : isGemini
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        {metadata.name}
                      </h3>
                      {metadata.isImplemented ? (
                        <Badge
                          variant="subtle"
                          size="sm"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                        >
                          Active & Functional
                        </Badge>
                      ) : (
                        <Badge variant="subtle" size="sm">
                          Interface Scaffolding (Phase 2)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {metadata.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {metadata.docsUrl && (
                    <a
                      href={metadata.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-mono"
                    >
                      <span>Docs</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {isConfigured && (
                    <button
                      type="button"
                      onClick={() => handleRemove(metadata.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10 transition-colors"
                      title="Remove provider configuration"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Key Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-foreground flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>API Key</span>
                      {(isAnthropic || isGemini) && <span className="text-red-500">*</span>}
                    </label>
                    {hasKey && (
                      <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Key in active memory
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showKey[metadata.id] ? 'text' : 'password'}
                      placeholder={
                        hasKey
                          ? `Active: ${maskedKeys[metadata.id]}`
                          : isAnthropic
                          ? 'sk-ant-api03-...'
                          : isGemini
                          ? 'AIzaSy...'
                          : 'Enter API Key...'
                      }
                      value={apiKeys[metadata.id] || ''}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, [metadata.id]: e.target.value })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background/50 pl-3 pr-10 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKey({ ...showKey, [metadata.id]: !showKey[metadata.id] })
                      }
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {showKey[metadata.id] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <label className="font-medium text-foreground">
                        Model Selection
                      </label>
                      {liveDiscovered.length > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          Available: {liveDiscovered.length}
                        </span>
                      )}
                    </div>

                    {(hasKey || apiKeys[metadata.id]) && (
                      <button
                        type="button"
                        onClick={() => handleRefreshModels(provider)}
                        disabled={isFetchingModels}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono disabled:opacity-50"
                        title="Query provider API directly for live available models"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isFetchingModels ? 'animate-spin text-primary' : ''}`}
                        />
                        <span>{isFetchingModels ? 'Fetching...' : 'Refresh Models'}</span>
                      </button>
                    )}
                  </div>

                  <select
                    value={currentSelected}
                    onChange={(e) =>
                      setSelectedModels({
                        ...selectedModels,
                        [metadata.id]: e.target.value,
                      })
                    }
                    disabled={isFetchingModels || availableModels.length === 0}
                    className="h-9 w-full rounded-md border border-input bg-background/50 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {availableModels.length === 0 ? (
                      <option value="" disabled>
                        {isFetchingModels
                          ? 'Discovering available models...'
                          : isGemini
                          ? 'No models discovered — enter API key and click Refresh Models'
                          : 'No models available'}
                      </option>
                    ) : (
                      availableModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id}) {m.isDefault ? '• Default' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Unavailable Model Warning Alert */}
              {isSelectedModelUnavailable && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      The selected model is no longer available for this API key. Refresh models and select another model.
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5 font-mono">
                      Previously saved model identifier: &ldquo;{currentSelected}&rdquo; was not returned by the provider API.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Discovery Status / Error Alerts */}
              {discoveryInfo && discoveryInfo.status !== 'models_loaded' && (
                <div className="text-xs">
                  {discoveryInfo.status === 'fetching' && (
                    <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Querying provider API for available models...</span>
                    </div>
                  )}

                  {discoveryInfo.status === 'no_compatible_models' && (
                    <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-start gap-2 text-amber-600 dark:text-amber-400">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">No compatible models discovered</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          The API response did not include any models supporting the required &ldquo;generateContent&rdquo; capability for this key.
                        </p>
                      </div>
                    </div>
                  )}

                  {discoveryInfo.status === 'invalid_key' && (
                    <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 flex items-start gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Model Discovery: Invalid API Key</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {discoveryInfo.error || 'Authentication failed. Please verify your Google AI Studio API key.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {discoveryInfo.status === 'quota_exceeded' && (
                    <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 flex items-start gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Model Discovery: Quota Exceeded (RESOURCE_EXHAUSTED)</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {discoveryInfo.error || 'Google Gemini quota or rate limit exceeded. Please check your Google AI Studio plan or retry shortly.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {discoveryInfo.status === 'network_error' && (
                    <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 flex items-start gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Model Discovery: Network / Endpoint Error</p>
                        <p className="text-[11px] opacity-90 mt-0.5 font-mono">
                          {discoveryInfo.error || 'Unable to connect to the Google Gemini models endpoint.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Base URL (for compatible endpoints or custom proxy) */}
              {(metadata.requiresBaseUrl || metadata.defaultBaseUrl) && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Base Endpoint URL</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      (Optional proxy / local host)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={baseUrls[metadata.id] || ''}
                    onChange={(e) =>
                      setBaseUrls({ ...baseUrls, [metadata.id]: e.target.value })
                    }
                    placeholder={metadata.defaultBaseUrl || 'https://...'}
                    className="h-9 w-full rounded-md border border-input bg-background/50 px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}

              {/* Test Result Message */}
              {testRes && (
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                    testRes.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {testRes.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testRes.message}</p>
                    {testRes.latencyMs !== undefined && (
                      <span className="text-[10px] font-mono opacity-80 block mt-0.5">
                        Latency: {testRes.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-muted-foreground font-mono">
                  {config?.lastTestedAt && (
                    <span>
                      Tested: {new Date(config.lastTestedAt).toLocaleDateString()}{' '}
                      {new Date(config.lastTestedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(metadata.id)}
                    isLoading={isTesting}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Test Connection
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave(metadata)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {saveSuccess[metadata.id] ? 'Saved!' : 'Save Integration'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
