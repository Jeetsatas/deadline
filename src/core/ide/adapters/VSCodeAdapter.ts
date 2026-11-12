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

export class VSCodeAdapter implements IIDEAdapter {
  readonly id = 'vscode' as const;

  readonly metadata: IDEProviderMetadata = {
    id: 'vscode',
    name: 'vscode',
    displayName: 'Visual Studio Code',
    kind: 'code_editor',
    description: 'Extensible code editor with support for rich developer tooling and extensions.',
    primaryActionLabel: 'Open Workspace in VS Code',
    defaultBinaryNames: ['code'],
    macAppNames: ['Visual Studio Code.app'],
    docsUrl: 'https://code.visualstudio.com/docs',
    installGuideUrl: 'https://code.visualstudio.com/download',
    badgeLabel: 'Code Editor',
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
      command: 'code',
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

