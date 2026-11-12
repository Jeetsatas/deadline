import { Deadline } from '@/types';
import {
  ProjectConfiguration,
  ProjectType,
  ProjectLanguage,
  PackageManager,
  HostRuntimes,
} from './ProjectTypes';

export class ProjectConfigurationResolver {
  /**
   * Resolves a recommended project configuration based on the Deadline deliverable,
   * title, description, and approved AI execution plan.
   */
  static resolveRecommendedConfiguration(
    deadline: Deadline,
    runtimes?: HostRuntimes,
    defaultParentDirectory = '/Users/apple/Desktop'
  ): ProjectConfiguration {
    const textCorpus = [
      deadline.title,
      deadline.description,
      deadline.expectedOutput,
      deadline.minimumAcceptableOutput || '',
      deadline.approvedPlan?.taskUnderstanding || '',
      deadline.approvedPlan?.suggestedApproach || '',
      ...(deadline.approvedPlan?.requiredResources || []),
      ...(deadline.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    // Clean folder name from deadline title
    const sanitizedName = deadline.title
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const folderName = sanitizedName || 'Project-App';
    const projectPath = `${defaultParentDirectory}/${folderName}`;

    // 1. Detect Python
    if (
      textCorpus.includes('python') ||
      textCorpus.includes('pytest') ||
      textCorpus.includes('django') ||
      textCorpus.includes('fastapi') ||
      textCorpus.includes('flask')
    ) {
      return {
        mode: 'new',
        projectName: folderName,
        parentDirectory: defaultParentDirectory,
        projectPath,
        projectType: 'python-app',
        language: 'python',
        packageManager: 'pip',
        initGit: true,
        customDependencies: this.extractCustomDependencies(deadline, 'pip'),
        description: deadline.description,
        recommendationReason:
          'Detected Python keywords in project requirements and execution plan.',
      };
    }

    // 2. Detect Backend / Node.js
    const isExplicitBackend =
      deadline.title.toLowerCase().includes('backend') ||
      deadline.title.toLowerCase().includes('api') ||
      deadline.title.toLowerCase().includes('microservice') ||
      (deadline.approvedPlan?.taskUnderstanding || '').toLowerCase().includes('backend') ||
      (deadline.approvedPlan?.taskUnderstanding || '').toLowerCase().includes('api') ||
      (deadline.approvedPlan?.taskUnderstanding || '').toLowerCase().includes('microservice');

    if (
      isExplicitBackend ||
      ((textCorpus.includes('backend') ||
        textCorpus.includes('api') ||
        textCorpus.includes('server') ||
        textCorpus.includes('microservice')) &&
        !textCorpus.includes('react') &&
        !textCorpus.includes('frontend'))
    ) {
      return {
        mode: 'new',
        projectName: folderName,
        parentDirectory: defaultParentDirectory,
        projectPath,
        projectType: textCorpus.includes('rest') || textCorpus.includes('express') ? 'node-api' : 'node-ts',
        language: 'typescript',
        packageManager: this.resolveDefaultNodePackageManager(runtimes),
        initGit: true,
        customDependencies: this.extractCustomDependencies(deadline, 'npm'),
        description: deadline.description,
        recommendationReason:
          'Detected Node.js / backend API requirements in execution plan.',
      };
    }

    // 3. Detect Static HTML/CSS
    if (
      textCorpus.includes('static html') ||
      textCorpus.includes('vanilla js') ||
      textCorpus.includes('landing page') && !textCorpus.includes('react')
    ) {
      return {
        mode: 'new',
        projectName: folderName,
        parentDirectory: defaultParentDirectory,
        projectPath,
        projectType: 'static-web',
        language: 'html-css',
        packageManager: 'none',
        initGit: true,
        customDependencies: [],
        description: deadline.description,
        recommendationReason:
          'Detected static web or vanilla markup requirements without build framework.',
      };
    }

    // 4. Default for Web / Software Deliverables: React + Vite + TypeScript
    const chosenType: ProjectType = textCorpus.includes('javascript') && !textCorpus.includes('typescript')
      ? 'react-vite-js'
      : 'react-vite-ts';
    const chosenLang: ProjectLanguage = chosenType === 'react-vite-js' ? 'javascript' : 'typescript';

    return {
      mode: 'new',
      projectName: folderName,
      parentDirectory: defaultParentDirectory,
      projectPath,
      projectType: chosenType,
      language: chosenLang,
      packageManager: this.resolveDefaultNodePackageManager(runtimes),
      initGit: true,
      customDependencies: this.extractCustomDependencies(deadline, 'npm'),
      description: deadline.description,
      recommendationReason:
        deadline.approvedPlan
          ? 'Derived from approved execution plan requirements and deliverable specifications.'
          : 'Standard recommended modern single-page application setup.',
    };
  }

  /**
   * Resolves the best package manager based on host machine discovery.
   */
  private static resolveDefaultNodePackageManager(runtimes?: HostRuntimes): PackageManager {
    if (runtimes?.pnpm?.isInstalled) return 'pnpm';
    if (runtimes?.yarn?.isInstalled) return 'yarn';
    return 'npm';
  }

  /**
   * Extracts clean, safe package names mentioned in requiredResources.
   */
  private static extractCustomDependencies(deadline: Deadline, _pm: PackageManager): string[] {
    const raw = deadline.approvedPlan?.requiredResources || [];
    const sanitized: string[] = [];

    const skipKeywords = new Set([
      'typescript',
      'javascript',
      'python',
      'node',
      'vite',
      'git',
      'react',
      'react-dom',
      'pytest',
    ]);

    for (const item of raw) {
      const trimmed = item.trim().toLowerCase();
      // Keep only valid package names (alphanumeric, -, _, /)
      if (/^(@[a-z0-9_-]+\/)?[a-z0-9_-]+$/.test(trimmed)) {
        if (!skipKeywords.has(trimmed) && trimmed.length <= 40) {
          sanitized.push(trimmed);
        }
      }
    }

    return sanitized;
  }
}
