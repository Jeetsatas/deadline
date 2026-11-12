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

export class CodexAdapter implements IIDEAdapter {
  readonly id = 'codex' as const;

  readonly metadata: IDEProviderMetadata = {
    id: 'codex',
    name: 'codex',
    displayName: 'OpenAI Codex',
    kind: 'coding_agent',
    description: 'OpenAI agentic CLI coding tool and terminal command center.',
    primaryActionLabel: 'Start Working in OpenAI Codex',
    defaultBinaryNames: ['codex'],
    docsUrl: 'https://github.com/openai/codex',
    installGuideUrl: 'https://github.com/openai/codex#quickstart',
    badgeLabel: 'Coding Agent',
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
    context: IDEExecutionContext,
    _options?: Record<string, unknown>
  ): Promise<LaunchResult> {
    const prompt = IDEContextBuilder.buildInitialPrompt(context, this.id);
    return await bridgeClient.launchIDE({
      providerId: this.id,
      projectPath,
      command: 'codex',
      args: ['-C', projectPath, prompt],
      interactive: true,
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

