import {
  IIDEAdapter,
  IDEProviderMetadata,
  IDEDetectionResult,
  IDECapabilities,
  IDEExecutionContext,
  HandoffResult,
  LaunchResult,
  ILocalBridgeClient,
} from '../types';
import { IDECapabilityResolver } from '../IDECapabilityResolver';
import { IDEContextBuilder } from '../IDEContextBuilder';

export class AntigravityAdapter implements IIDEAdapter {
  readonly id = 'antigravity' as const;

  readonly metadata: IDEProviderMetadata = {
    id: 'antigravity',
    name: 'antigravity',
    displayName: 'Google Antigravity',
    kind: 'agentic_ide',
    description: 'Google agentic development environment and intelligent IDE with integrated AI assistant.',
    primaryActionLabel: 'Open in Google Antigravity',
    defaultBinaryNames: ['antigravity-ide', 'agy'],
    macAppNames: ['Antigravity IDE.app'],
    docsUrl: 'https://antigravity.google',
    installGuideUrl: 'https://antigravity.google/download',
    badgeLabel: 'Agentic IDE',
  };

  getCapabilities(detection?: IDEDetectionResult): IDECapabilities {
    return IDECapabilityResolver.resolveCapabilities(this.id, detection);
  }

  async detect(bridgeClient: ILocalBridgeClient): Promise<IDEDetectionResult> {
    const allDetected = await bridgeClient.detectIDEs();
    return (
      allDetected[this.id] || {
        providerId: this.id,
        isInstalled: false,
        detectedAt: new Date().toISOString(),
      }
    );
  }

  async prepareHandoff(
    bridgeClient: ILocalBridgeClient,
    projectPath: string,
    context: IDEExecutionContext
  ): Promise<HandoffResult> {
    const markdown = IDEContextBuilder.buildDeadlineContextMarkdown(context);
    return await bridgeClient.prepareHandoffFile(projectPath, markdown, 'DEADLINE_CONTEXT.md');
  }

  async launch(
    bridgeClient: ILocalBridgeClient,
    projectPath: string,
    _context: IDEExecutionContext,
    _options?: Record<string, unknown>
  ): Promise<LaunchResult> {
    return await bridgeClient.launchIDE({
      providerId: this.id,
      projectPath,
      command: 'antigravity',
      args: [projectPath, `${projectPath}/DEADLINE_CONTEXT.md`],
      interactive: false,
    });
  }

  async stopSession(
    bridgeClient: ILocalBridgeClient,
    sessionId: string,
    pid?: number
  ): Promise<boolean> {
    return await bridgeClient.stopSession(sessionId, pid);
  }
}

