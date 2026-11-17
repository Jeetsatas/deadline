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

export class ClaudeCodeAdapter implements IIDEAdapter {
  readonly id = 'claude_code' as const;

  readonly metadata: IDEProviderMetadata = {
    id: 'claude_code',
    name: 'claude_code',
    displayName: 'Claude Code',
    kind: 'coding_agent',
    description: 'Anthropic agentic CLI coding tool for agent-driven software development in terminal.',
    primaryActionLabel: 'CLI launch unavailable',
    defaultBinaryNames: ['claude'],
    macAppNames: ['Claude Code.app'],
    docsUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    installGuideUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview#installation',
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
      command: 'claude',
      args: [prompt],
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

