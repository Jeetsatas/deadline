import {
  ProjectConfiguration,
  ProjectInspectionResult,
  HostRuntimes,
  EnvironmentVerificationReport,
  InitializationProgressEvent,
  PackageManager,
} from './ProjectTypes';
import { localBridgeClient, LocalBridgeClient } from '../ide/bridge/LocalBridgeClient';
import { ProjectValidationService } from './ProjectValidationService';

export class ProjectInitializationService {
  constructor(private bridgeClient: LocalBridgeClient = localBridgeClient) {}

  /**
   * Retrieves available host development runtimes and package managers.
   */
  async getHostRuntimes(): Promise<HostRuntimes> {
    return await this.bridgeClient.getHostRuntimes();
  }

  /**
   * Triggers the operating system native folder picker dialog.
   */
  async pickFolder(
    prompt = 'Select Project Location',
    startingDirectory?: string
  ): Promise<{ success: boolean; path?: string; isGitRepo?: boolean; cancelled?: boolean; error?: string }> {
    return await this.bridgeClient.pickFolder(prompt, startingDirectory);
  }

  /**
   * Deeply inspects an existing project directory.
   */
  async inspectProject(projectPath: string): Promise<ProjectInspectionResult> {
    const res = await this.bridgeClient.inspectProject(projectPath);
    return res;
  }

  /**
   * Creates a new project directory within a validated parent directory.
   */
  async createProjectDirectory(
    parentDirectory: string,
    folderName: string
  ): Promise<{ success: boolean; projectPath?: string; alreadyExists?: boolean; error?: string }> {
    const validation = ProjectValidationService.validateDestinationPath(parentDirectory, folderName);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return await this.bridgeClient.createProjectDirectory(parentDirectory, folderName);
  }

  /**
   * Executes the full project initialization and dependency setup flow.
   */
  async initializeProject(
    config: ProjectConfiguration,
    onProgress?: (event: InitializationProgressEvent) => void
  ): Promise<{ success: boolean; report: EnvironmentVerificationReport; error?: string }> {
    const notify = (stage: InitializationProgressEvent['stage'], message: string, details?: string) => {
      onProgress?.({
        stage,
        message,
        timestamp: new Date().toISOString(),
        details,
      });
    };

    try {
      // Step 1: Directory Setup
      if (config.mode === 'new') {
        notify('creating_directory', `Creating project folder "${config.projectName}"...`);
        const createRes = await this.createProjectDirectory(
          config.parentDirectory || '/Users/apple/Desktop',
          config.projectName
        );

        if (!createRes.success && !createRes.alreadyExists) {
          throw new Error(createRes.error || 'Failed to create project directory.');
        }

        notify(
          'creating_directory',
          `Project directory ready at ${config.projectPath}`
        );
      } else {
        notify('validating', `Validating existing project path at ${config.projectPath}...`);
        const inspect = await this.inspectProject(config.projectPath);
        if (!inspect.exists) {
          throw new Error(`Directory does not exist: ${config.projectPath}`);
        }
      }

      // Step 2: Template Scaffolding (if new project or bare directory)
      if (config.mode === 'new') {
        notify('scaffolding', `Scaffolding ${config.projectType} project structure...`);
        const templateRes = await this.bridgeClient.initializeProjectTemplate(
          config.projectPath,
          config.projectType,
          config.projectName,
          config.initGit
        );

        if (!templateRes.success) {
          throw new Error(templateRes.error || 'Failed to initialize project template.');
        }

        notify(
          'scaffolding',
          `Created ${templateRes.createdFiles?.length || 0} initial project files.`
        );
      }

      // Step 3: Git Initialization
      if (config.initGit) {
        notify('initializing_git', 'Initializing Git version control repository...');
      }

      // Step 4: Dependency Installation
      if (config.packageManager !== 'none') {
        notify(
          'installing_deps',
          `Installing dependencies using ${config.packageManager}... This may take a minute.`
        );

        const depRes = await this.bridgeClient.installDependencies(
          config.projectPath,
          config.packageManager,
          config.customDependencies
        );

        if (!depRes.success) {
          notify(
            'installing_deps',
            `Warning: Dependency installation reported: ${depRes.error || 'Check log output'}`,
            depRes.stderr || depRes.stdout
          );
        } else {
          notify('installing_deps', 'Dependencies successfully installed.');
        }
      }

      // Step 5: Environment Verification
      notify('verifying', 'Verifying environment readiness and build integrity...');
      const report = await this.bridgeClient.verifyEnvironment(config.projectPath);

      if (report.isReady) {
        notify('completed', 'Environment verified and ready for universal IDE execution.');
      } else {
        notify(
          'verifying',
          `Environment partially ready with ${report.issues.length} warning(s).`,
          report.issues.join('; ')
        );
      }

      return { success: report.isReady, report };
    } catch (err) {
      const errorMsg = (err as Error).message || 'Project initialization failed.';
      notify('failed', errorMsg);
      return {
        success: false,
        error: errorMsg,
        report: {
          projectPath: config.projectPath,
          isReady: false,
          directoryExists: false,
          manifestExists: false,
          dependenciesInstalled: false,
          gitInitialized: false,
          buildCheckPassed: false,
          issues: [errorMsg],
          verifiedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Installs dependencies in a project directory with strict package manager allowlisting.
   */
  async installDependencies(
    projectPath: string,
    packageManager: PackageManager,
    packages?: string[]
  ): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
    return await this.bridgeClient.installDependencies(projectPath, packageManager, packages);
  }

  /**
   * Verifies that the project environment is complete.
   */
  async verifyEnvironment(
    projectPath: string,
    validationCommand?: string
  ): Promise<EnvironmentVerificationReport> {
    return await this.bridgeClient.verifyEnvironment(projectPath, validationCommand);
  }
}

export const projectInitializationService = new ProjectInitializationService();
