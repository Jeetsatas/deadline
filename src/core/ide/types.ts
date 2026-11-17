import { ApprovedAIExecutionPlan } from '@/types';
import type {
  HostRuntimes,
  ProjectInspectionResult,
  EnvironmentVerificationReport,
} from '../project/ProjectTypes';

export type IDEProviderId =
  | 'claude_code'
  | 'codex'
  | 'cursor'
  | 'antigravity'
  | 'vscode'
  | 'windsurf'
  | string;

export type IDEProviderKind =
  | 'coding_agent'
  | 'agentic_ide'
  | 'ai_ide'
  | 'code_editor';

export type CapabilityStatus =
  | 'supported'
  | 'unsupported'
  | 'not_detected'
  | 'not_yet_verified'
  | 'requires_setup';

export type IDECapabilityKey =
  | 'installationDetection'
  | 'versionDetection'
  | 'workspaceOpening'
  | 'contextFileHandoff'
  | 'terminalLaunch'
  | 'interactiveAgentExecution'
  | 'processTracking'
  | 'sessionCancellation'
  | 'changedFileInspection'
  | 'executionStatusMonitoring';

export type IDECapabilities = Record<IDECapabilityKey, CapabilityStatus>;

export interface IDEProviderMetadata {
  id: IDEProviderId;
  name: string;
  displayName: string;
  kind: IDEProviderKind;
  description: string;
  primaryActionLabel: string; // e.g. "Start Working in Claude Code" or "Open in Antigravity"
  secondaryActionLabel?: string;
  defaultBinaryNames: string[];
  macAppNames?: string[];
  docsUrl: string;
  installGuideUrl: string;
  badgeLabel: string; // e.g. "Coding Agent", "Agentic IDE", "AI IDE", "Code Editor"
}

export interface IDEDetectionResult {
  providerId: IDEProviderId;
  isInstalled: boolean;
  platform?: string;
  binaryPath?: string;
  version?: string;
  appPath?: string;
  error?: string;
  detectedAt: string;
}

export interface IDEExecutionContext {
  deadlineId: string;
  deadlineTitle: string;
  description: string;
  deliverableCategory: string;
  expectedOutput: string;
  minimumAcceptableOutput: string;
  priority: string;
  dueDate: string;
  dueTime?: string;
  executionApproach: string;
  approvedPlan?: ApprovedAIExecutionPlan;
  milestones: Array<{
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    order: number;
    isCriticalPath?: boolean;
  }>;
  requiredResources: string[];
  firstActionableStep: string;
  userInstructions?: string;
  acceptanceCriteria: string[];
  projectConfig?: unknown;
  environmentVerification?: unknown;
}

export type ExecutionSessionStatus =
  | 'not_started'
  | 'preparing'
  | 'ready'
  | 'launching'
  | 'launched'
  | 'running'
  | 'externally_managed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'disconnected'
  | 'awaiting_verification';

export interface ExecutionEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'launch' | 'warning' | 'error' | 'file_change' | 'stop';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionSession {
  sessionId: string;
  deadlineId: string;
  providerId: IDEProviderId;
  projectPath: string;
  startedAt: string;
  endedAt?: string;
  status: ExecutionSessionStatus;
  lastActivityAt: string;
  handoffContextVersion: number;
  processId?: number;
  errorMessage?: string;
  executionEvents: ExecutionEvent[];
  changedFilesCount?: number;
}

export interface HandoffResult {
  success: boolean;
  filePath: string;
  created: boolean;
  existingFileOverwritten: boolean;
  existingSpecialFilesDetected: string[];
  error?: string;
}

export interface LaunchResult {
  success: boolean;
  sessionId: string;
  providerId: IDEProviderId;
  status: ExecutionSessionStatus;
  processId?: number;
  launchCommandSummary?: string;
  message: string;
  error?: string;
}

export interface WorkspaceChangesResult {
  isGitRepo: boolean;
  modifiedFiles: string[];
  untrackedFiles: string[];
  deletedFiles: string[];
  totalChanges: number;
  summary: string;
}

export interface IDETranscriptSession {
  id: string;
  providerId: IDEProviderId;
  sourceName: string;
  startedAt: string;
  updatedAt: string;
  sizeBytes: number;
}

export interface ILocalBridgeClient {
  isBridgeReachable(): Promise<boolean>;
  getHealth(): Promise<{ status: string; version: string; port: number }>;
  pair(token: string): Promise<boolean>;
  detectIDEs(): Promise<Record<IDEProviderId, IDEDetectionResult>>;
  validatePath(projectPath: string): Promise<{ valid: boolean; resolvedPath?: string; error?: string; isGitRepo?: boolean }>;
  prepareHandoffFile(projectPath: string, content: string, fileName?: string): Promise<HandoffResult>;
  launchIDE(params: {
    providerId: IDEProviderId;
    projectPath: string;
    command: string;
    args: string[];
    interactive: boolean;
    env?: Record<string, string>;
  }): Promise<LaunchResult>;
  getSessionStatus(sessionId: string, pid?: number): Promise<{ isAlive: boolean; status: ExecutionSessionStatus }>;
  stopSession(sessionId: string, pid?: number): Promise<boolean>;
  inspectWorkspaceChanges(projectPath: string): Promise<WorkspaceChangesResult>;
  discoverTranscripts(projectPath: string, providerId: IDEProviderId): Promise<{ sessions: IDETranscriptSession[]; message?: string }>;
  readTranscript(projectPath: string, providerId: IDEProviderId, sessionId: string): Promise<{ success: boolean; transcript?: string; session?: IDETranscriptSession; error?: string }>;
  pickFolder(prompt?: string, startingDirectory?: string): Promise<{ success: boolean; path?: string; isGitRepo?: boolean; cancelled?: boolean; error?: string }>;
  getHostRuntimes(): Promise<HostRuntimes>;
  inspectProject(projectPath: string): Promise<ProjectInspectionResult>;
  createProjectDirectory(parentDirectory: string, folderName: string): Promise<{ success: boolean; projectPath?: string; alreadyExists?: boolean; error?: string }>;
  initializeProjectTemplate(projectPath: string, templateId: string, projectName: string, initGit?: boolean): Promise<{ success: boolean; createdFiles?: string[]; error?: string }>;
  installDependencies(projectPath: string, packageManager: string, packages?: string[]): Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }>;
  verifyEnvironment(projectPath: string, validationCommand?: string): Promise<EnvironmentVerificationReport>;
}

export interface IIDEAdapter {
  readonly id: IDEProviderId;
  readonly metadata: IDEProviderMetadata;
  getCapabilities(detection?: IDEDetectionResult): IDECapabilities;
  detect(bridgeClient: ILocalBridgeClient): Promise<IDEDetectionResult>;
  prepareHandoff(
    bridgeClient: ILocalBridgeClient,
    projectPath: string,
    context: IDEExecutionContext
  ): Promise<HandoffResult>;
  launch(
    bridgeClient: ILocalBridgeClient,
    projectPath: string,
    context: IDEExecutionContext,
    options?: Record<string, unknown>
  ): Promise<LaunchResult>;
  stopSession?(
    bridgeClient: ILocalBridgeClient,
    sessionId: string,
    pid?: number
  ): Promise<boolean>;
}

