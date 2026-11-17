import {
  IDEProviderId,
  IDEDetectionResult,
  IDECapabilities,
  CapabilityStatus,
} from './types';

export class IDECapabilityResolver {
  /**
   * Resolves explicit capability map for a given provider based on verified local detection.
   * Ensures that no capability is reported as 'supported' unless verified.
   */
  static resolveCapabilities(
    providerId: IDEProviderId,
    detection?: IDEDetectionResult
  ): IDECapabilities {
    const isInstalled = Boolean(detection?.isInstalled);

    const baseCapabilities: IDECapabilities = {
      installationDetection: 'supported',
      versionDetection: detection?.version ? 'supported' : isInstalled ? 'unsupported' : 'not_detected',
      workspaceOpening: isInstalled ? 'not_yet_verified' : 'not_detected',
      contextFileHandoff: isInstalled ? 'not_yet_verified' : 'not_detected',
      terminalLaunch: 'unsupported',
      interactiveAgentExecution: 'unsupported',
      processTracking: 'unsupported',
      sessionCancellation: 'unsupported',
      changedFileInspection: isInstalled ? 'not_yet_verified' : 'not_detected',
      executionStatusMonitoring: 'unsupported',
    };

    switch (providerId) {
      case 'claude_code':
        return {
          ...baseCapabilities,
          terminalLaunch: isInstalled ? 'unsupported' : 'not_detected',
          interactiveAgentExecution: isInstalled ? 'unsupported' : 'not_detected',
        };

      case 'codex':
        return {
          ...baseCapabilities,
          terminalLaunch: isInstalled ? 'unsupported' : 'not_detected',
          interactiveAgentExecution: isInstalled ? 'unsupported' : 'not_detected',
        };

      case 'antigravity':
        return {
          ...baseCapabilities,
          terminalLaunch: 'unsupported', // Opens native app window
          interactiveAgentExecution: isInstalled ? 'unsupported' : 'not_detected',
          executionStatusMonitoring: 'unsupported',
        };

      case 'cursor':
        return {
          ...baseCapabilities,
          terminalLaunch: 'unsupported',
          interactiveAgentExecution: 'requires_setup', // Opens Cursor with context; agent execution is user-triggered in-editor
          processTracking: isInstalled ? 'unsupported' : 'not_detected',
          sessionCancellation: 'unsupported',
          executionStatusMonitoring: 'unsupported', // External IDE editor session
        };

      case 'vscode':
        return {
          ...baseCapabilities,
          terminalLaunch: 'unsupported',
          interactiveAgentExecution: 'unsupported', // Standard editor handoff
          processTracking: isInstalled ? 'unsupported' : 'not_detected',
          sessionCancellation: 'unsupported',
          executionStatusMonitoring: 'unsupported',
        };

      case 'windsurf':
        return {
          ...baseCapabilities,
          terminalLaunch: 'unsupported',
          interactiveAgentExecution: 'requires_setup', // AI IDE Cascade agent is triggered in-editor
          processTracking: isInstalled ? 'unsupported' : 'not_detected',
          sessionCancellation: 'unsupported',
          executionStatusMonitoring: 'unsupported',
        };

      default:
        return baseCapabilities;
    }
  }

  /**
   * Helper to determine primary action verb and label for an IDE.
   */
  static getActionLabel(providerId: IDEProviderId, isInstalled: boolean): string {
    if (!isInstalled) {
      return 'Detect Installation';
    }

    switch (providerId) {
      case 'claude_code':
        return 'CLI launch unavailable';
      case 'codex':
        return 'CLI launch unavailable';
      case 'antigravity':
        return 'Open in Google Antigravity';
      case 'cursor':
        return 'Open Workspace in Cursor';
      case 'vscode':
        return 'Open Workspace in VS Code';
      case 'windsurf':
        return 'Open Workspace in Windsurf';
      default:
        return 'Open Workspace';
    }
  }

  /**
   * Checks if an operation capability is supported.
   */
  static isCapabilitySupported(status: CapabilityStatus): boolean {
    return status === 'supported';
  }
}

