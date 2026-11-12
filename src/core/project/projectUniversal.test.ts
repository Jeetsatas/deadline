import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectValidationService } from './ProjectValidationService';
import { ProjectTemplateRegistry } from './ProjectTemplateRegistry';
import { ProjectConfigurationResolver } from './ProjectConfigurationResolver';
import { ProjectDependencyManager } from './ProjectDependencyManager';
import { ProjectInitializationService } from './ProjectInitializationService';
import { Deadline } from '@/types';
import { LocalBridgeClient } from '../ide/bridge/LocalBridgeClient';

describe('Phase 4 Project Initialization, Environment Setup & Universal IDE Execution', () => {
  const sampleDeadline: Deadline = {
    id: 'dl_calc_1',
    title: 'Calculator Application',
    description: 'Build a responsive arithmetic calculator app with unit test suite.',
    expectedOutput: 'A fully functional calculator application with keyboard support.',
    minimumAcceptableOutput: 'Basic calculator supporting +, -, *, /.',
    priority: 'high',
    status: 'in_progress',
    deadlineDate: '2026-11-14',
    deadlineTime: '18:00',
    dueDateTime: '2026-11-14T18:00:00.000Z',
    progress: 10,
    deliverableType: 'software',
    executionApproach: 'prototype_first',
    referenceLinks: [],
    attachments: [],
    tags: ['calculator', 'frontend'],
    notes: 'Keep UI accessible.',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    milestones: [],
    approvedPlan: {
      id: 'plan_1',
      deadlineId: 'dl_calc_1',
      approvalStatus: 'approved',
      version: 1,
      generatedAt: '2026-11-12T10:05:00.000Z',
      approvedAt: '2026-11-12T10:06:00.000Z',
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      taskUnderstanding: 'Create a responsive web-based calculator with unit tests.',
      suggestedApproach: 'Use React and Vite for rapid development and Vitest for testing.',
      firstActionableStep: 'Scaffold project with Vite and initialize arithmetic reducer.',
      requiredResources: ['TypeScript', 'Vite', 'Vitest', 'lucide-react'],
      suggestedMilestones: [],
    },
  };

  describe('1. Folder Name & Destination Validation', () => {
    it('accepts valid project folder names', () => {
      expect(ProjectValidationService.validateFolderName('Calculator-App').valid).toBe(true);
      expect(ProjectValidationService.validateFolderName('my_calculator_v1').valid).toBe(true);
      expect(ProjectValidationService.validateFolderName('Project 123').valid).toBe(true);
    });

    it('rejects path separators and directory traversal in folder names', () => {
      expect(ProjectValidationService.validateFolderName('../evil').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('my/folder').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('my\\folder').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('..').valid).toBe(false);
    });

    it('rejects reserved system names and control characters', () => {
      expect(ProjectValidationService.validateFolderName('.git').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('node_modules').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('CON').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('').valid).toBe(false);
      expect(ProjectValidationService.validateFolderName('   ').valid).toBe(false);
    });

    it('validates and composes safe destination paths', () => {
      const res = ProjectValidationService.validateDestinationPath(
        '/Users/apple/Desktop/Projects',
        'Calculator-App'
      );
      expect(res.valid).toBe(true);
      expect(res.destinationPath).toBe('/Users/apple/Desktop/Projects/Calculator-App');
    });
  });

  describe('2. Project Template Registry', () => {
    it('registers all official templates without IDE coupling', () => {
      const registry = new ProjectTemplateRegistry();
      const templates = registry.listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(6);

      const ids = templates.map((t) => t.id);
      expect(ids).toContain('react-vite-ts');
      expect(ids).toContain('react-vite-js');
      expect(ids).toContain('node-ts');
      expect(ids).toContain('node-api');
      expect(ids).toContain('python-app');
      expect(ids).toContain('static-web');
      expect(ids).toContain('custom');
    });

    it('provides correct language and package manager for each template', () => {
      const registry = new ProjectTemplateRegistry();
      const reactTs = registry.getTemplate('react-vite-ts');
      expect(reactTs?.language).toBe('typescript');
      expect(reactTs?.defaultPackageManager).toBe('npm');
      expect(reactTs?.defaultDependencies).toContain('react');

      const python = registry.getTemplate('python-app');
      expect(python?.language).toBe('python');
      expect(python?.defaultPackageManager).toBe('pip');
      expect(python?.defaultDependencies).toContain('pytest');
    });
  });

  describe('3. Project Configuration Resolver', () => {
    it('recommends React + Vite (TypeScript) when frontend React keywords are detected in plan', () => {
      const config = ProjectConfigurationResolver.resolveRecommendedConfiguration(sampleDeadline);
      expect(config.projectType).toBe('react-vite-ts');
      expect(config.language).toBe('typescript');
      expect(config.packageManager).toBe('npm');
      expect(config.recommendationReason).toContain('execution plan');
    });

    it('recommends Python when Python keywords are present in plan', () => {
      const pythonDeadline: Deadline = {
        ...sampleDeadline,
        title: 'Python Data Processor',
        description: 'Process telemetry data using Python 3 and pytest.',
        expectedOutput: 'A clean python data processing script.',
        approvedPlan: {
          ...sampleDeadline.approvedPlan!,
          taskUnderstanding: 'Write Python script with pytest coverage.',
          suggestedApproach: 'Use standard library and pytest.',
          requiredResources: ['Python 3', 'pytest'],
        },
      };

      const config = ProjectConfigurationResolver.resolveRecommendedConfiguration(pythonDeadline);
      expect(config.projectType).toBe('python-app');
      expect(config.language).toBe('python');
      expect(config.packageManager).toBe('pip');
      expect(config.recommendationReason).toContain('Python');
    });

    it('recommends Node.js API when backend REST API keywords are present', () => {
      const apiDeadline: Deadline = {
        ...sampleDeadline,
        title: 'Backend User Service',
        description: 'Microservice API backend server.',
        expectedOutput: 'REST API service.',
        tags: ['backend', 'api'],
        approvedPlan: {
          ...sampleDeadline.approvedPlan!,
          taskUnderstanding: 'Create backend API server.',
          suggestedApproach: 'Express REST API.',
          requiredResources: ['Node.js', 'Express'],
        },
      };

      const config = ProjectConfigurationResolver.resolveRecommendedConfiguration(apiDeadline);
      expect(['node-api', 'node-ts']).toContain(config.projectType);
      expect(config.language).toBe('typescript');
      expect(config.packageManager).toBe('npm');
    });
  });

  describe('4. Dependency Manager & Security Sanitization', () => {
    it('accepts valid alphanumeric, scoped, and versioned package names', () => {
      expect(ProjectDependencyManager.isValidPackageName('react')).toBe(true);
      expect(ProjectDependencyManager.isValidPackageName('lucide-react')).toBe(true);
      expect(ProjectDependencyManager.isValidPackageName('@types/node')).toBe(true);
      expect(ProjectDependencyManager.isValidPackageName('pytest==8.0.0')).toBe(true);
    });

    it('strictly rejects malicious package names with shell injection operators', () => {
      expect(ProjectDependencyManager.isValidPackageName('react; rm -rf /')).toBe(false);
      expect(ProjectDependencyManager.isValidPackageName('axios && curl evil.com')).toBe(false);
      expect(ProjectDependencyManager.isValidPackageName('`whoami`')).toBe(false);
      expect(ProjectDependencyManager.isValidPackageName('$(cat /etc/passwd)')).toBe(false);
      expect(ProjectDependencyManager.isValidPackageName('pkg | bash')).toBe(false);
      expect(ProjectDependencyManager.isValidPackageName('name with space')).toBe(false);
    });

    it('filters untrusted inputs from package lists', () => {
      const input = ['react', 'bad; injection', '@types/react', 'rm -rf *', 'tailwindcss'];
      const sanitized = ProjectDependencyManager.sanitizePackageList(input);
      expect(sanitized).toEqual(['react', '@types/react', 'tailwindcss']);
    });
  });

  describe('5. Project Initialization Service Workflow', () => {
    let mockClient: LocalBridgeClient;

    beforeEach(() => {
      mockClient = {
        isBridgeReachable: vi.fn().mockResolvedValue(true),
        getHealth: vi.fn().mockResolvedValue({ status: 'ok', version: '1.0.0', port: 4488 }),
        pair: vi.fn().mockResolvedValue(true),
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
          projectPath: '/Users/apple/Desktop/Projects/Calculator-App',
          exists: true,
          isGitRepo: true,
          hasPackageJson: true,
          hasRequirementsTxt: false,
          hasPyproject: false,
          detectedFramework: 'react',
          detectedLanguage: 'typescript',
          detectedPackageManager: 'npm',
          dependencies: ['react', 'react-dom'],
          devDependencies: ['vite', 'typescript'],
          specialFiles: ['README.md'],
          fileCount: 8,
        }),
        createProjectDirectory: vi.fn().mockResolvedValue({
          success: true,
          projectPath: '/Users/apple/Desktop/Projects/Calculator-App',
        }),
        initializeProjectTemplate: vi.fn().mockResolvedValue({
          success: true,
          createdFiles: ['package.json', 'src/App.tsx', 'index.html'],
        }),
        installDependencies: vi.fn().mockResolvedValue({
          success: true,
          stdout: 'added 30 packages in 2s',
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
      } as unknown as LocalBridgeClient;
    });

    it('executes full project initialization workflow with progress events', async () => {
      const service = new ProjectInitializationService(mockClient);
      const events: string[] = [];

      const config = {
        mode: 'new' as const,
        projectName: 'Calculator-App',
        parentDirectory: '/Users/apple/Desktop/Projects',
        projectPath: '/Users/apple/Desktop/Projects/Calculator-App',
        projectType: 'react-vite-ts' as const,
        language: 'typescript' as const,
        packageManager: 'npm' as const,
        initGit: true,
        customDependencies: ['lucide-react'],
      };

      const result = await service.initializeProject(config, (ev) => {
        events.push(ev.stage);
      });

      expect(mockClient.createProjectDirectory).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Projects',
        'Calculator-App'
      );
      expect(mockClient.initializeProjectTemplate).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Projects/Calculator-App',
        'react-vite-ts',
        'Calculator-App',
        true
      );
      expect(mockClient.installDependencies).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Projects/Calculator-App',
        'npm',
        ['lucide-react']
      );
      expect(mockClient.verifyEnvironment).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Projects/Calculator-App'
      );

      expect(result.success).toBe(true);
      expect(result.report.isReady).toBe(true);
      expect(events).toContain('creating_directory');
      expect(events).toContain('scaffolding');
      expect(events).toContain('installing_deps');
      expect(events).toContain('verifying');
      expect(events).toContain('completed');
    });

    it('inspects existing projects without overwriting existing files', async () => {
      const service = new ProjectInitializationService(mockClient);

      const inspection = await service.inspectProject('/Users/apple/Desktop/Projects/Calculator-App');
      expect(mockClient.inspectProject).toHaveBeenCalledWith(
        '/Users/apple/Desktop/Projects/Calculator-App'
      );
      expect(inspection.exists).toBe(true);
      expect(inspection.detectedFramework).toBe('react');
      expect(inspection.detectedLanguage).toBe('typescript');
      expect(inspection.hasPackageJson).toBe(true);
    });
  });
});
