import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ideProviderRegistry } from './IDEProviderRegistry';
import { IDECapabilityResolver } from './IDECapabilityResolver';
import { IDEContextBuilder } from './IDEContextBuilder';
import { IDEExecutionService } from './IDEExecutionService';
import { LocalBridgeClient } from './bridge/LocalBridgeClient';
import { Deadline, ILocalBridgeClient, IDEDetectionResult } from '@/types';

describe('Phase 3 Universal IDE Integration & Execution Engine', () => {
  const sampleDeadline: Deadline = {
    id: 'dl_test_calculator',
    title: 'Build a Calculator Application',
    description: 'Build a fully functional calculator application with clean UI and test coverage.',
    expectedOutput: 'A fully working calculator application supporting arithmetic operations and keyboard input.',
    minimumAcceptableOutput: 'Basic arithmetic calculator supporting addition, subtraction, multiplication, division.',
    priority: 'high',
    status: 'in_progress',
    deadlineDate: '2026-11-13',
    deadlineTime: '23:59',
    dueDateTime: '2026-11-13T23:59:00.000Z',
    progress: 25,
    deliverableType: 'software',
    executionApproach: 'prototype_first',
    referenceLinks: [],
    attachments: [],
    tags: ['calculator', 'prototype'],
    notes: 'Focus on clean state management.',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    milestones: [
      {
        id: 'ms_1',
        deadlineId: 'dl_test_calculator',
        title: 'Project scaffolding and arithmetic core engine',
        isCompleted: true,
        order: 1,
        isCriticalPath: true,
        createdAt: '2026-11-12T10:00:00.000Z',
        updatedAt: '2026-11-12T10:30:00.000Z',
      },
      {
        id: 'ms_2',
        deadlineId: 'dl_test_calculator',
        title: 'Responsive keypad UI and display screen',
        isCompleted: false,
        order: 2,
        isCriticalPath: true,
        createdAt: '2026-11-12T10:00:00.000Z',
        updatedAt: '2026-11-12T10:00:00.000Z',
      },
    ],
    approvedPlan: {
      id: 'plan_123',
      deadlineId: 'dl_test_calculator',
      approvalStatus: 'approved',
      version: 1,
      generatedAt: '2026-11-12T10:05:00.000Z',
      approvedAt: '2026-11-12T10:06:00.000Z',
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      taskUnderstanding: 'Create a responsive web-based calculator with unit tests.',
      suggestedApproach: 'Implement core arithmetic reducer first, then wire accessible keypad UI.',
      firstActionableStep: 'Create arithmetic evaluate function and verify edge cases (divide by zero).',
      requiredResources: ['TypeScript', 'Vite', 'Vitest', 'Tailwind CSS'],
      suggestedMilestones: [
        {
          title: 'Project scaffolding and arithmetic core engine',
          description: 'Core math functions',
          order: 1,
          isCriticalPath: true,
        },
      ],
      deliverableSpecificGuidance: 'Ensure division by zero displays Error gracefully.',
    },
  };

  describe('1. Universal Provider Registry & Equality', () => {
    it('registers all 6 first-class IDE and agent providers equally', () => {
      const providers = ideProviderRegistry.listProviders();
      expect(providers).toHaveLength(6);

      const ids = providers.map((p) => p.id);
      expect(ids).toContain('claude_code');
      expect(ids).toContain('codex');
      expect(ids).toContain('cursor');
      expect(ids).toContain('antigravity');
      expect(ids).toContain('vscode');
      expect(ids).toContain('windsurf');
    });

    it('provides valid metadata for every registered provider without favoritism', () => {
      const metadata = ideProviderRegistry.listMetadata();
      for (const meta of metadata) {
        expect(meta.id).toBeTruthy();
        expect(meta.displayName).toBeTruthy();
        expect(meta.kind).toMatch(/coding_agent|agentic_ide|ai_ide|code_editor/);
        expect(meta.description).toBeTruthy();
        expect(meta.primaryActionLabel).toBeTruthy();
        expect(meta.docsUrl).toMatch(/^https?:\/\//);
        expect(meta.defaultBinaryNames.length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Capability Resolver & Honest Reporting', () => {
    it('resolves installed CLI coding agent capabilities (Claude Code & Codex)', () => {
      const detection: IDEDetectionResult = {
        providerId: 'claude_code',
        isInstalled: true,
        binaryPath: '/Users/apple/.local/bin/claude',
        version: '2.1.319',
        detectedAt: new Date().toISOString(),
      };

      const caps = IDECapabilityResolver.resolveCapabilities('claude_code', detection);
      expect(caps.installationDetection).toBe('supported');
      expect(caps.interactiveAgentExecution).toBe('supported');
      expect(caps.terminalLaunch).toBe('supported');
      expect(caps.contextFileHandoff).toBe('supported');
      expect(caps.changedFileInspection).toBe('supported');
    });

    it('resolves uninstalled provider capabilities honestly as not_detected or requires_setup', () => {
      const detection: IDEDetectionResult = {
        providerId: 'cursor',
        isInstalled: false,
        detectedAt: new Date().toISOString(),
      };

      const caps = IDECapabilityResolver.resolveCapabilities('cursor', detection);
      expect(caps.installationDetection).toBe('supported');
      expect(caps.versionDetection).toBe('not_detected');
      expect(caps.workspaceOpening).toBe('not_detected');
      expect(caps.interactiveAgentExecution).toBe('requires_setup');
    });

    it('reports workspaceOpening for GUI IDEs without falsely claiming interactive CLI agent execution', () => {
      const detection: IDEDetectionResult = {
        providerId: 'vscode',
        isInstalled: true,
        binaryPath: '/usr/local/bin/code',
        detectedAt: new Date().toISOString(),
      };

      const caps = IDECapabilityResolver.resolveCapabilities('vscode', detection);
      expect(caps.workspaceOpening).toBe('supported');
      expect(caps.interactiveAgentExecution).toBe('unsupported');
    });
  });

  describe('3. Canonical Handoff Generation (DEADLINE_CONTEXT.md)', () => {
    it('creates structured, decoupled context markdown preserving task and fallback MVP', () => {
      const executionService = new IDEExecutionService();
      const context = executionService.createExecutionContext(
        sampleDeadline,
        'Run test suite after implementation.'
      );

      const markdown = IDEContextBuilder.buildDeadlineContextMarkdown(context);

      expect(markdown).toContain('# DEADLINE EXECUTION CONTEXT');
      expect(markdown).toContain('Build a Calculator Application');
      expect(markdown).toContain('A fully working calculator application supporting arithmetic operations');
      expect(markdown).toContain('Basic arithmetic calculator supporting addition, subtraction');
      expect(markdown).toContain('Project scaffolding and arithmetic core engine');
      expect(markdown).toContain('Responsive keypad UI and display screen');
      expect(markdown).toContain('TypeScript');
      expect(markdown).toContain('Run test suite after implementation.');
    });

    it('never contains API keys, passwords, or secret tokens in handoff markdown', () => {
      const executionService = new IDEExecutionService();
      const context = executionService.createExecutionContext(sampleDeadline);
      const markdown = IDEContextBuilder.buildDeadlineContextMarkdown(context);

      expect(markdown).not.toContain('AIzaSy');
      expect(markdown).not.toContain('sk-ant');
      expect(markdown).not.toContain('Bearer');
      expect(markdown).not.toContain('pairingToken');
      expect(markdown).not.toContain('token:');
    });

    it('builds initial agent prompt tailored to provider', () => {
      const executionService = new IDEExecutionService();
      const context = executionService.createExecutionContext(sampleDeadline);

      const claudePrompt = IDEContextBuilder.buildInitialPrompt(context, 'claude_code');
      expect(claudePrompt).toContain('DEADLINE_CONTEXT.md');
      expect(claudePrompt).toContain('Build a Calculator Application');

      const codexPrompt = IDEContextBuilder.buildInitialPrompt(context, 'codex');
      expect(codexPrompt).toContain('DEADLINE_CONTEXT.md');
    });
  });

  describe('4. IDEExecutionService Execution Lifecycle', () => {
    let mockBridgeClient: ILocalBridgeClient;

    beforeEach(() => {
      mockBridgeClient = {
        isBridgeReachable: vi.fn().mockResolvedValue(true),
        getHealth: vi.fn().mockResolvedValue({ status: 'ok', version: '1.0.0', port: 4488 }),
        pair: vi.fn().mockResolvedValue(true),
        detectIDEs: vi.fn().mockResolvedValue({
          claude_code: {
            providerId: 'claude_code',
            isInstalled: true,
            binaryPath: '/Users/apple/.local/bin/claude',
            version: '2.1.319',
            detectedAt: new Date().toISOString(),
          },
          codex: {
            providerId: 'codex',
            isInstalled: true,
            binaryPath: '/Users/apple/.local/bin/codex',
            version: '0.167.0',
            detectedAt: new Date().toISOString(),
          },
        }),
        validatePath: vi.fn().mockResolvedValue({
          valid: true,
          resolvedPath: '/Users/apple/Desktop/Project- Deadline ',
          isGitRepo: true,
        }),
        prepareHandoffFile: vi.fn().mockResolvedValue({
          success: true,
          filePath: '/Users/apple/Desktop/Project- Deadline /DEADLINE_CONTEXT.md',
          created: true,
          existingFileOverwritten: false,
          existingSpecialFilesDetected: [],
        }),
        launchIDE: vi.fn().mockResolvedValue({
          success: true,
          sessionId: 'sess_test_123',
          providerId: 'claude_code',
          status: 'running',
          processId: 98765,
          launchCommandSummary: 'claude DEADLINE_CONTEXT.md',
          message: 'Launched claude_code in interactive Terminal',
        }),
        getSessionStatus: vi.fn().mockResolvedValue({
          isAlive: true,
          status: 'running',
        }),
        stopSession: vi.fn().mockResolvedValue(true),
        inspectWorkspaceChanges: vi.fn().mockResolvedValue({
          isGitRepo: true,
          modifiedFiles: ['src/App.tsx'],
          untrackedFiles: ['src/components/Calculator.tsx'],
          deletedFiles: [],
          totalChanges: 2,
          summary: '2 changed file(s)',
        }),
        pickFolder: vi.fn().mockResolvedValue({
          success: true,
          path: '/Users/apple/Desktop/Projects',
          isGitRepo: false,
        }),
        getHostRuntimes: vi.fn().mockResolvedValue({
          node: { isInstalled: true, version: 'v20.0.0' },
          npm: { isInstalled: true, version: '10.0.0' },
          pnpm: { isInstalled: false },
          yarn: { isInstalled: false },
          python: { isInstalled: true, version: '3.11.0' },
          pip: { isInstalled: true, version: '23.0' },
          git: { isInstalled: true, version: '2.40.0' },
        }),
        inspectProject: vi.fn().mockResolvedValue({
          projectPath: '/Users/apple/Desktop/Project- Deadline ',
          exists: true,
          isGitRepo: true,
          hasPackageJson: true,
          hasRequirementsTxt: false,
          hasPyproject: false,
          detectedFramework: 'react',
          detectedLanguage: 'typescript',
          detectedPackageManager: 'npm',
          dependencies: ['react'],
          devDependencies: ['vite'],
          specialFiles: ['README.md'],
          fileCount: 10,
        }),
        createProjectDirectory: vi.fn().mockResolvedValue({
          success: true,
          projectPath: '/Users/apple/Desktop/Projects/Calculator-App',
        }),
        initializeProjectTemplate: vi.fn().mockResolvedValue({
          success: true,
          createdFiles: ['package.json', 'src/App.tsx'],
        }),
        installDependencies: vi.fn().mockResolvedValue({
          success: true,
          stdout: 'added 25 packages',
          stderr: '',
          exitCode: 0,
        }),
        verifyEnvironment: vi.fn().mockResolvedValue({
          projectPath: '/Users/apple/Desktop/Projects/Calculator-App',
          isReady: true,
          directoryExists: true,
          manifestExists: true,
          dependenciesInstalled: true,
          gitInitialized: true,
          buildCheckPassed: true,
          issues: [],
          verifiedAt: new Date().toISOString(),
        }),
      };
    });

    it('starts an execution session by validating path, preparing handoff, and launching', async () => {
      const service = new IDEExecutionService(mockBridgeClient);

      const { session, launchResult } = await service.startExecution(
        sampleDeadline,
        'claude_code',
        '/Users/apple/Desktop/Project- Deadline ',
        'Focus on Milestone 1 first'
      );

      expect(mockBridgeClient.validatePath).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Project- Deadline '
      );
      expect(mockBridgeClient.prepareHandoffFile).toHaveBeenCalled();
      expect(mockBridgeClient.launchIDE).toHaveBeenCalled();

      expect(launchResult.success).toBe(true);
      expect(session.sessionId).toBe('sess_test_123');
      expect(session.providerId).toBe('claude_code');
      expect(session.status).toBe('running');
      expect(session.processId).toBe(98765);
      expect(session.executionEvents.length).toBeGreaterThan(0);
    });

    it('rejects execution if the project path is invalid', async () => {
      mockBridgeClient.validatePath = vi.fn().mockResolvedValue({
        valid: false,
        error: 'Directory does not exist: /invalid/nonexistent',
      });

      const service = new IDEExecutionService(mockBridgeClient);

      await expect(
        service.startExecution(sampleDeadline, 'claude_code', '/invalid/nonexistent')
      ).rejects.toThrow('Directory does not exist: /invalid/nonexistent');
    });

    it('refreshes active session status from bridge', async () => {
      const service = new IDEExecutionService(mockBridgeClient);
      const initialSession = {
        sessionId: 'sess_test_123',
        deadlineId: sampleDeadline.id,
        providerId: 'claude_code',
        projectPath: '/Users/apple/Desktop/Project- Deadline ',
        startedAt: new Date().toISOString(),
        status: 'running' as const,
        lastActivityAt: new Date().toISOString(),
        handoffContextVersion: 1,
        processId: 98765,
        executionEvents: [],
      };

      const refreshed = await service.refreshSessionStatus(initialSession);
      expect(mockBridgeClient.getSessionStatus).toHaveBeenCalledWith('sess_test_123', 98765);
      expect(refreshed.status).toBe('running');
    });

    it('transitions to awaiting_verification when process exits normally', async () => {
      mockBridgeClient.getSessionStatus = vi.fn().mockResolvedValue({
        isAlive: false,
        status: 'awaiting_verification',
      });

      const service = new IDEExecutionService(mockBridgeClient);
      const initialSession = {
        sessionId: 'sess_test_123',
        deadlineId: sampleDeadline.id,
        providerId: 'claude_code',
        projectPath: '/Users/apple/Desktop/Project- Deadline ',
        startedAt: new Date().toISOString(),
        status: 'running' as const,
        lastActivityAt: new Date().toISOString(),
        handoffContextVersion: 1,
        processId: 98765,
        executionEvents: [],
      };

      const refreshed = await service.refreshSessionStatus(initialSession);
      expect(refreshed.status).toBe('awaiting_verification');
    });

    it('stops an active session cleanly', async () => {
      const service = new IDEExecutionService(mockBridgeClient);
      const session = {
        sessionId: 'sess_test_123',
        deadlineId: sampleDeadline.id,
        providerId: 'claude_code',
        projectPath: '/Users/apple/Desktop/Project- Deadline ',
        startedAt: new Date().toISOString(),
        status: 'running' as const,
        lastActivityAt: new Date().toISOString(),
        handoffContextVersion: 1,
        processId: 98765,
        executionEvents: [],
      };

      const stopped = await service.stopSession(session);
      expect(stopped).toBe(true);
      expect(mockBridgeClient.stopSession).toHaveBeenCalledWith('sess_test_123', 98765);
    });

    it('inspects workspace changes and reports modified and untracked files', async () => {
      const service = new IDEExecutionService(mockBridgeClient);
      const changes = await service.verifyWorkspaceChanges('/Users/apple/Desktop/Project- Deadline ');

      expect(changes.isGitRepo).toBe(true);
      expect(changes.totalChanges).toBe(2);
      expect(changes.modifiedFiles).toContain('src/App.tsx');
      expect(changes.untrackedFiles).toContain('src/components/Calculator.tsx');
    });
  });

  describe('5. LocalBridgeClient Security & Protocol Checks', () => {
    it('sets and clears pairing tokens securely in memory', () => {
      const client = new LocalBridgeClient(4488);
      expect(client.getPairingToken()).toBeNull();

      client.setPairingToken('00e901de26fe44ca7874cedcf4a9433a6b805b06f593c03fdcc26b54ec43bb77');
      expect(client.getPairingToken()).toBe(
        '00e901de26fe44ca7874cedcf4a9433a6b805b06f593c03fdcc26b54ec43bb77'
      );

      client.setPairingToken(null);
      expect(client.getPairingToken()).toBeNull();
    });
  });
});
