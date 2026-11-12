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

export class WindsurfAdapter implements IIDEAdapter {
  readonly id = 'windsurf' as const;

  readonly metadata: IDEProviderMetadata = {
    id: 'windsurf',
    name: 'windsurf',
    displayName: 'Windsurf',
    kind: 'ai_ide',
    description: 'Codeium agentic AI-powered IDE with Cascade flow collaborative agent intelligence.',
    primaryActionLabel: 'Open Workspace in Windsurf',
    defaultBinaryNames: ['windsurf'],
    macAppNames: ['Windsurf.app'],
    docsUrl: 'https://codeium.com/windsurf',
    installGuideUrl: 'https://codeium.com/windsurf/download',
    badgeLabel: 'AI IDE',
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
      command: 'windsurf',
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

