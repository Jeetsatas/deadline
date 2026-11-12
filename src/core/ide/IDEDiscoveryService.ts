import {
  IDEProviderId,
  IDEDetectionResult,
  IDECapabilities,
  IDEProviderMetadata,
  ILocalBridgeClient,
} from './types';
import { ideProviderRegistry } from './IDEProviderRegistry';
import { localBridgeClient } from './bridge/LocalBridgeClient';

export interface DiscoveredIDEInfo {
  providerId: IDEProviderId;
  metadata: IDEProviderMetadata;
  detection: IDEDetectionResult;
  capabilities: IDECapabilities;
}

export class IDEDiscoveryService {
  constructor(private bridgeClient: ILocalBridgeClient = localBridgeClient) {}

  /**
   * Discovers all supported IDEs and their current real installation states.
   */
  async discoverAll(): Promise<Record<IDEProviderId, DiscoveredIDEInfo>> {
    const isReachable = await this.bridgeClient.isBridgeReachable();
    let rawDetection: Record<IDEProviderId, IDEDetectionResult> = {};

    if (isReachable) {
      try {
        rawDetection = await this.bridgeClient.detectIDEs();
      } catch {
        rawDetection = {};
      }
    }

    const result: Record<IDEProviderId, DiscoveredIDEInfo> = {};
    const providers = ideProviderRegistry.listProviders();

    for (const provider of providers) {
      const detection: IDEDetectionResult = rawDetection[provider.id] || {
        providerId: provider.id,
        isInstalled: false,
        detectedAt: new Date().toISOString(),
      };

      const capabilities = provider.getCapabilities(detection);

      result[provider.id] = {
        providerId: provider.id,
        metadata: provider.metadata,
        detection,
        capabilities,
      };
    }

    return result;
  }

  /**
   * Discovers a single provider's status.
   */
  async discoverProvider(providerId: IDEProviderId): Promise<DiscoveredIDEInfo | null> {
    const provider = ideProviderRegistry.getProvider(providerId);
    if (!provider) return null;

    let detection: IDEDetectionResult = {
      providerId,
      isInstalled: false,
      detectedAt: new Date().toISOString(),
    };

    const isReachable = await this.bridgeClient.isBridgeReachable();
    if (isReachable) {
      try {
        const all = await this.bridgeClient.detectIDEs();
        if (all[providerId]) {
          detection = all[providerId];
        }
      } catch {
        // Fall back to uninstalled
      }
    }

    return {
      providerId,
      metadata: provider.metadata,
      detection,
      capabilities: provider.getCapabilities(detection),
    };
  }
}

export const ideDiscoveryService = new IDEDiscoveryService();
