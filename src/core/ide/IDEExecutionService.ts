import {
  IDEProviderId,
  IDEExecutionContext,
  ExecutionSession,
  LaunchResult,
  WorkspaceChangesResult,
  ILocalBridgeClient,
} from './types';
import { Deadline } from '@/types';
import { ideProviderRegistry } from './IDEProviderRegistry';
import { localBridgeClient } from './bridge/LocalBridgeClient';

export class IDEExecutionService {
  constructor(private bridgeClient: ILocalBridgeClient = localBridgeClient) {}

  /**
   * Transforms a Deadline domain object into a universal IDEExecutionContext.
   */
  createExecutionContext(deadline: Deadline, userInstructions?: string): IDEExecutionContext {
    return {
      deadlineId: deadline.id,
      deadlineTitle: deadline.title,
      description: deadline.description,
      deliverableCategory: deadline.deliverableType,
      expectedOutput: deadline.expectedOutput,
      minimumAcceptableOutput: deadline.minimumAcceptableOutput || deadline.expectedOutput,
      priority: deadline.priority,
      dueDate: deadline.deadlineDate,
      dueTime: deadline.deadlineTime,
      executionApproach: deadline.executionApproach || 'guided_execution',
      approvedPlan: deadline.approvedPlan,
      milestones: (deadline.milestones || []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        isCompleted: m.isCompleted,
        order: m.order,
        isCriticalPath: m.isCriticalPath,
      })),
      requiredResources: deadline.approvedPlan?.requiredResources || [],
      firstActionableStep:
        deadline.approvedPlan?.firstActionableStep || 'Initialize project files and setup structure.',
      userInstructions,
      acceptanceCriteria: [
        `Deliverable matches expected output: "${deadline.expectedOutput}"`,
        `Minimum fallback MVP satisfied: "${deadline.minimumAcceptableOutput || deadline.expectedOutput}"`,
        'All critical path milestones verified.',
      ],
    };
  }

  /**
   * Prepares canonical handoff package and starts execution session with the selected IDE.
   */
  async startExecution(
    deadline: Deadline,
    providerId: IDEProviderId,
    projectPath: string,
    userInstructions?: string
  ): Promise<{ session: ExecutionSession; launchResult: LaunchResult }> {
    const provider = ideProviderRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`IDE Provider "${providerId}" is not registered.`);
    }

    // 1. Verify project directory
    const validation = await this.bridgeClient.validatePath(projectPath);
    if (!validation.valid) {
      throw new Error(validation.error || `Invalid project directory path: ${projectPath}`);
    }

    const resolvedPath = validation.resolvedPath || projectPath;

    // 2. Prepare handoff context
    const context = this.createExecutionContext(deadline, userInstructions);

    // 3. Write DEADLINE_CONTEXT.md
    const handoffResult = await provider.prepareHandoff(
      this.bridgeClient,
      resolvedPath,
      context
    );

    if (!handoffResult.success) {
      throw new Error(handoffResult.error || 'Failed to prepare execution handoff file.');
    }

    // 4. Launch selected IDE or Coding Agent
    const launchResult = await provider.launch(
      this.bridgeClient,
      resolvedPath,
      context
    );

    if (!launchResult.success) {
      throw new Error(launchResult.error || `Failed to launch ${provider.metadata.displayName}`);
    }

    // 5. Construct initial ExecutionSession
    const nowIso = new Date().toISOString();
    const session: ExecutionSession = {
      sessionId: launchResult.sessionId,
      deadlineId: deadline.id,
      providerId,
      projectPath: resolvedPath,
      startedAt: nowIso,
      status: launchResult.status,
      lastActivityAt: nowIso,
      handoffContextVersion: deadline.approvedPlan?.version || 1,
      processId: launchResult.processId,
      executionEvents: [
        {
          id: `evt_${Date.now()}_1`,
          timestamp: nowIso,
          type: 'info',
          message: `Created canonical handoff file at ${handoffResult.filePath}`,
        },
        {
          id: `evt_${Date.now()}_2`,
          timestamp: nowIso,
          type: 'launch',
          message: launchResult.message,
          metadata: { command: launchResult.launchCommandSummary },
        },
      ],
    };

    return { session, launchResult };
  }

  /**
   * Checks real execution status from the local bridge.
   */
  async refreshSessionStatus(session: ExecutionSession): Promise<ExecutionSession> {
    const statusResult = await this.bridgeClient.getSessionStatus(
      session.sessionId,
      session.processId
    );

    const nowIso = new Date().toISOString();
    let updatedStatus = session.status;

    if (!statusResult.isAlive && session.status === 'running') {
      updatedStatus = 'awaiting_verification';
    } else if (statusResult.isAlive && session.status === 'launched') {
      updatedStatus = 'running';
    }

    return {
      ...session,
      status: updatedStatus,
      lastActivityAt: nowIso,
    };
  }

  /**
   * Stops an active execution session.
   */
  async stopSession(session: ExecutionSession): Promise<boolean> {
    const provider = ideProviderRegistry.getProvider(session.providerId);
    if (provider?.stopSession) {
      return await provider.stopSession(this.bridgeClient, session.sessionId, session.processId);
    }
    return await this.bridgeClient.stopSession(session.sessionId, session.processId);
  }

  /**
   * Inspects permitted changed files in the project directory.
   */
  async verifyWorkspaceChanges(projectPath: string): Promise<WorkspaceChangesResult> {
    return await this.bridgeClient.inspectWorkspaceChanges(projectPath);
  }
}

export const ideExecutionService = new IDEExecutionService();
