import { ProjectTemplate } from './ProjectTypes';

export class ProjectDependencyManager {
  /**
   * Validates and sanitizes a package name to avoid command injection.
   * Only allows valid npm / pip package name patterns.
   */
  static isValidPackageName(pkg: string): boolean {
    if (!pkg || typeof pkg !== 'string') return false;
    const trimmed = pkg.trim();
    if (trimmed.length === 0 || trimmed.length > 120) return false;

    // Reject control chars, spaces, quotes, backticks, shell operators
    if (/[\s;`$|&><\n\r"'\\]/.test(trimmed)) return false;

    // npm scoped / non-scoped or pip format
    return /^(@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+(==[a-zA-Z0-9_.-]+)?$/.test(trimmed);
  }

  /**
   * Sanitizes a list of package names, filtering out invalid or dangerous inputs.
   */
  static sanitizePackageList(packages: string[]): string[] {
    return (packages || [])
      .map((p) => p.trim())
      .filter((p) => this.isValidPackageName(p));
  }

  /**
   * Resolves the complete set of dependencies for a project template and custom additions.
   */
  static resolveDependenciesForTemplate(
    template: ProjectTemplate,
    customPackages: string[] = []
  ): {
    dependencies: string[];
    devDependencies: string[];
    installCommand: string;
  } {
    const validCustom = this.sanitizePackageList(customPackages);
    const dependencies = Array.from(new Set([...template.defaultDependencies, ...validCustom]));
    const devDependencies = [...template.defaultDevDependencies];

    let installCommand: string;
    const pm = template.defaultPackageManager;

    if (pm === 'npm') {
      installCommand = 'npm install';
    } else if (pm === 'pnpm') {
      installCommand = 'pnpm install';
    } else if (pm === 'yarn') {
      installCommand = 'yarn install';
    } else if (pm === 'pip') {
      installCommand = 'python3 -m pip install -r requirements.txt';
    } else {
      installCommand = 'No dependency installation required';
    }

    return {
      dependencies,
      devDependencies,
      installCommand,
    };
  }
}
