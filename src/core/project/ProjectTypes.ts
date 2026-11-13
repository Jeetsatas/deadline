export type ProjectMode = 'new' | 'existing';

export type ProjectType =
  | 'react-vite-ts'
  | 'react-vite-js'
  | 'node-ts'
  | 'node-api'
  | 'python-app'
  | 'static-web'
  | 'custom';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'pip' | 'none';

export type ProjectLanguage = 'typescript' | 'javascript' | 'python' | 'html-css' | 'other';

export interface ProjectConfiguration {
  mode: ProjectMode;
  projectName: string;
  parentDirectory?: string;
  projectPath: string;
  projectType: ProjectType;
  language: ProjectLanguage;
  packageManager: PackageManager;
  initGit: boolean;
  customDependencies: string[];
  description?: string;
  recommendationReason?: string;
}

export interface ProjectTemplate {
  id: ProjectType;
  name: string;
  displayName: string;
  description: string;
  language: ProjectLanguage;
  defaultPackageManager: PackageManager;
  requiredRuntimes: string[];
  defaultDependencies: string[];
  defaultDevDependencies: string[];
  verificationCommand?: string;
}

export interface ProjectInspectionResult {
  projectPath: string;
  exists: boolean;
  isGitRepo: boolean;
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasPyproject: boolean;
  packageJson?: {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  detectedFramework: string;
  detectedLanguage: ProjectLanguage;
  detectedPackageManager: PackageManager;
  dependencies: string[];
  devDependencies: string[];
  specialFiles: string[];
  fileCount: number;
}

export interface RuntimeInfo {
  isInstalled: boolean;
  version?: string;
  path?: string;
}

export interface HostRuntimes {
  node: RuntimeInfo;
  npm: RuntimeInfo;
  pnpm: RuntimeInfo;
  yarn: RuntimeInfo;
  python: RuntimeInfo;
  pip: RuntimeInfo;
  git: RuntimeInfo;
}

export interface EnvironmentVerificationReport {
  projectPath: string;
  isReady: boolean;
  directoryExists: boolean;
  manifestExists: boolean;
  dependenciesInstalled: boolean;
  gitInitialized: boolean;
  buildCheckPassed: boolean;
  buildOutput?: string;
  issues: string[];
  verifiedAt: string;
}

export type InitializationStage =
  | 'idle'
  | 'validating'
  | 'creating_directory'
  | 'scaffolding'
  | 'installing_deps'
  | 'initializing_git'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface InitializationProgressEvent {
  stage: InitializationStage;
  message: string;
  timestamp: string;
  details?: string;
}

