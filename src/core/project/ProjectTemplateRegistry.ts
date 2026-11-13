import { ProjectType, ProjectTemplate } from './ProjectTypes';

export class ProjectTemplateRegistry {
  private templates: Map<ProjectType, ProjectTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    // 1. React 18 + Vite + TypeScript (Recommended default for web frontends)
    this.register({
      id: 'react-vite-ts',
      name: 'react-vite-ts',
      displayName: 'React 18 + Vite (TypeScript)',
      description: 'Modern front-end application with React 18, Vite 5, TypeScript 5, and fast HMR.',
      language: 'typescript',
      defaultPackageManager: 'npm',
      requiredRuntimes: ['node', 'npm'],
      defaultDependencies: ['react', 'react-dom', 'lucide-react'],
      defaultDevDependencies: [
        '@types/react',
        '@types/react-dom',
        '@vitejs/plugin-react',
        'typescript',
        'vite',
      ],
      verificationCommand: 'npm run build',
    });

    // 2. React 18 + Vite + JavaScript
    this.register({
      id: 'react-vite-js',
      name: 'react-vite-js',
      displayName: 'React 18 + Vite (JavaScript)',
      description: 'Simple React 18 single-page application using modern JavaScript (ESNext).',
      language: 'javascript',
      defaultPackageManager: 'npm',
      requiredRuntimes: ['node', 'npm'],
      defaultDependencies: ['react', 'react-dom', 'lucide-react'],
      defaultDevDependencies: ['@vitejs/plugin-react', 'vite'],
      verificationCommand: 'npm run build',
    });

    // 3. Node.js + TypeScript Service / CLI
    this.register({
      id: 'node-ts',
      name: 'node-ts',
      displayName: 'Node.js + TypeScript Backend',
      description: 'Server-side Node.js application or utility configured with TypeScript.',
      language: 'typescript',
      defaultPackageManager: 'npm',
      requiredRuntimes: ['node', 'npm'],
      defaultDependencies: [],
      defaultDevDependencies: ['typescript', '@types/node'],
      verificationCommand: 'npm run build',
    });

    // 4. Node.js REST API (Express)
    this.register({
      id: 'node-api',
      name: 'node-api',
      displayName: 'Node.js REST API',
      description: 'RESTful API service with Express and CORS configuration.',
      language: 'typescript',
      defaultPackageManager: 'npm',
      requiredRuntimes: ['node', 'npm'],
      defaultDependencies: ['express', 'cors'],
      defaultDevDependencies: ['typescript', '@types/node', '@types/express', '@types/cors'],
      verificationCommand: 'npm run build',
    });

    // 5. Python 3 Application
    this.register({
      id: 'python-app',
      name: 'python-app',
      displayName: 'Python 3 Application',
      description: 'Python application with standard module structure, virtual environment, and pytest.',
      language: 'python',
      defaultPackageManager: 'pip',
      requiredRuntimes: ['python', 'pip'],
      defaultDependencies: ['pytest'],
      defaultDevDependencies: [],
      verificationCommand: 'python3 -m unittest discover',
    });

    // 6. Static Web (HTML/CSS/JS)
    this.register({
      id: 'static-web',
      name: 'static-web',
      displayName: 'Static Web Application',
      description: 'Lightweight HTML5, modern CSS, and vanilla ES module application with zero build step.',
      language: 'html-css',
      defaultPackageManager: 'none',
      requiredRuntimes: [],
      defaultDependencies: [],
      defaultDevDependencies: [],
    });

    // 7. Custom / Bare Project
    this.register({
      id: 'custom',
      name: 'custom',
      displayName: 'Custom / Minimal Project',
      description: 'Clean project directory with canonical README and git configuration.',
      language: 'other',
      defaultPackageManager: 'npm',
      requiredRuntimes: [],
      defaultDependencies: [],
      defaultDevDependencies: [],
    });
  }

  register(template: ProjectTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: ProjectType): ProjectTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }
}

export const projectTemplateRegistry = new ProjectTemplateRegistry();

