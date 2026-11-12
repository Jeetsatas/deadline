#!/usr/bin/env node
/* global process, console, URL */

/**
 * Deadline Local Execution Bridge Daemon
 *
 * Runs strictly on 127.0.0.1 (IPv4 loopback).
 * Authenticates all protected endpoints using a cryptographically generated pairing token.
 * Provides safe IDE detection, path validation, handoff generation, and controlled execution.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execSync, spawnSync } from 'node:child_process';

const PORT = parseInt(process.env.DEADLINE_BRIDGE_PORT || '4488', 10);
const HOST = '127.0.0.1';

// Setup storage directory for authentication and audit logs
const DEADLINE_DIR = path.join(os.homedir(), '.deadline');
if (!fs.existsSync(DEADLINE_DIR)) {
  fs.mkdirSync(DEADLINE_DIR, { mode: 0o700, recursive: true });
}

const AUTH_FILE = path.join(DEADLINE_DIR, 'bridge-auth.json');
const AUDIT_LOG_FILE = path.join(DEADLINE_DIR, 'audit.log');

// Generate or load 256-bit pairing token
let pairingToken = '';
try {
  if (fs.existsSync(AUTH_FILE)) {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    if (data.token && typeof data.token === 'string' && data.token.length >= 32) {
      pairingToken = data.token;
    }
  }
} catch {
  pairingToken = '';
}

if (!pairingToken) {
  pairingToken = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({ token: pairingToken, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 }
  );
}

// Active sessions tracking
const activeSessions = new Map();

// Helper: Append to audit log
function writeAuditLog(action, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    metadata,
  };
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', { mode: 0o600 });
  } catch (err) {
    console.error('[AuditLog] Failed to append log:', err);
  }
}

// Helper: Find binary on machine across known paths
function findBinary(names) {
  const extraDirs = [
    path.join(os.homedir(), '.local', 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    path.join(os.homedir(), '.npm-global', 'bin'),
  ];

  for (const name of names) {
    // 1. Try which
    try {
      const res = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (res && fs.existsSync(res)) {
        return res;
      }
    } catch {
      // Ignore
    }

    // 2. Try explicit directories
    for (const dir of extraDirs) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

// Helper: Find macOS application bundle
function findMacApp(appNames) {
  if (process.platform !== 'darwin') return null;
  const appDirs = ['/Applications', path.join(os.homedir(), 'Applications')];
  for (const appName of appNames) {
    for (const dir of appDirs) {
      const candidate = path.join(dir, appName);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

// Safe path validation
function validateProjectPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return { valid: false, error: 'Project path must be a non-empty string.' };
  }

  // Prevent null bytes or obvious injection
  if (rawPath.includes('\0')) {
    return { valid: false, error: 'Path contains invalid characters.' };
  }

  // Preserve path as given (do not strip trailing spaces which can be valid in directory names)
  const cleanPath = rawPath.replace(/[\r\n]+/g, '');
  const normalized = path.normalize(cleanPath);
  const resolved = path.resolve(normalized);

  // Directory traversal check
  if (rawPath.includes('..') && !resolved.startsWith(os.homedir())) {
    return { valid: false, error: 'Path traversal is not permitted.' };
  }

  // Deny system root paths
  const forbiddenRoots = [
    '/',
    '/System',
    '/Library',
    '/etc',
    '/bin',
    '/sbin',
    '/usr',
    '/private',
    'C:\\',
    'C:\\Windows',
  ];

  if (forbiddenRoots.includes(resolved)) {
    return { valid: false, error: 'Access to system root directory is forbidden.' };
  }

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `Directory does not exist: ${resolved}` };
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { valid: false, error: `Path is not a directory: ${resolved}` };
    }
  } catch (e) {
    return { valid: false, error: `Cannot read directory metadata: ${e.message}` };
  }

  const isGitRepo = fs.existsSync(path.join(resolved, '.git'));
  return { valid: true, resolvedPath: resolved, isGitRepo };
}

// Detect all 6 IDE providers
function detectAllProviders() {
  const now = new Date().toISOString();
  const providers = {};

  // 1. Claude Code
  const claudeBinary = findBinary(['claude']);
  let claudeVersion = '';
  if (claudeBinary) {
    try {
      const v = spawnSync(claudeBinary, ['--version'], { encoding: 'utf8', timeout: 3000 });
      claudeVersion = (v.stdout || v.stderr || '').trim().split('\n')[0];
    } catch {
      claudeVersion = 'Detected';
    }
  }
  providers.claude_code = {
    providerId: 'claude_code',
    isInstalled: Boolean(claudeBinary),
    binaryPath: claudeBinary || undefined,
    version: claudeVersion || undefined,
    detectedAt: now,
  };

  // 2. OpenAI Codex
  const codexBinary = findBinary(['codex']);
  let codexVersion = '';
  if (codexBinary) {
    try {
      const v = spawnSync(codexBinary, ['--version'], { encoding: 'utf8', timeout: 3000 });
      codexVersion = (v.stdout || v.stderr || '').trim().split('\n')[0];
    } catch {
      codexVersion = 'Detected';
    }
  }
  providers.codex = {
    providerId: 'codex',
    isInstalled: Boolean(codexBinary),
    binaryPath: codexBinary || undefined,
    version: codexVersion || undefined,
    detectedAt: now,
  };

  // 3. Google Antigravity
  const antigravityApp = findMacApp(['Antigravity IDE.app']);
  let antigravityBinary = findBinary(['antigravity-ide', 'agy']);
  if (!antigravityBinary && antigravityApp) {
    const internal = path.join(antigravityApp, 'Contents', 'Resources', 'app', 'bin', 'antigravity-ide');
    if (fs.existsSync(internal)) {
      antigravityBinary = internal;
    }
  }
  let antigravityVersion = '';
  if (antigravityBinary) {
    try {
      const v = spawnSync(antigravityBinary, ['--version'], { encoding: 'utf8', timeout: 3000 });
      antigravityVersion = (v.stdout || '').trim().split('\n')[0];
    } catch {
      antigravityVersion = '1.107.0';
    }
  }
  providers.antigravity = {
    providerId: 'antigravity',
    isInstalled: Boolean(antigravityBinary || antigravityApp),
    binaryPath: antigravityBinary || undefined,
    appPath: antigravityApp || undefined,
    version: antigravityVersion || (antigravityApp ? 'Installed' : undefined),
    detectedAt: now,
  };

  // 4. Cursor
  const cursorBinary = findBinary(['cursor']);
  const cursorApp = findMacApp(['Cursor.app']);
  providers.cursor = {
    providerId: 'cursor',
    isInstalled: Boolean(cursorBinary || cursorApp),
    binaryPath: cursorBinary || undefined,
    appPath: cursorApp || undefined,
    version: cursorBinary ? 'Detected' : cursorApp ? 'Installed' : undefined,
    detectedAt: now,
  };

  // 5. VS Code
  const codeBinary = findBinary(['code']);
  const codeApp = findMacApp(['Visual Studio Code.app']);
  providers.vscode = {
    providerId: 'vscode',
    isInstalled: Boolean(codeBinary || codeApp),
    binaryPath: codeBinary || undefined,
    appPath: codeApp || undefined,
    version: codeBinary ? 'Detected' : codeApp ? 'Installed' : undefined,
    detectedAt: now,
  };

  // 6. Windsurf
  const windsurfBinary = findBinary(['windsurf']);
  const windsurfApp = findMacApp(['Windsurf.app']);
  providers.windsurf = {
    providerId: 'windsurf',
    isInstalled: Boolean(windsurfBinary || windsurfApp),
    binaryPath: windsurfBinary || undefined,
    appPath: windsurfApp || undefined,
    version: windsurfBinary ? 'Detected' : windsurfApp ? 'Installed' : undefined,
    detectedAt: now,
  };

  return providers;
}

// Detect installed system runtimes and package managers
function detectRuntimes() {
  const result = {
    node: { isInstalled: false },
    npm: { isInstalled: false },
    pnpm: { isInstalled: false },
    yarn: { isInstalled: false },
    python: { isInstalled: false },
    pip: { isInstalled: false },
    git: { isInstalled: false },
  };

  // Node
  try {
    const v = execSync('node -v 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which node 2>/dev/null', { encoding: 'utf8' }).trim();
    result.node = { isInstalled: true, version: v, path: p };
  } catch {
    /* node check optional */
  }

  // npm
  try {
    const v = execSync('npm -v 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which npm 2>/dev/null', { encoding: 'utf8' }).trim();
    result.npm = { isInstalled: true, version: v, path: p };
  } catch {
    /* npm check optional */
  }

  // pnpm
  try {
    const v = execSync('pnpm -v 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which pnpm 2>/dev/null', { encoding: 'utf8' }).trim();
    result.pnpm = { isInstalled: true, version: v, path: p };
  } catch {
    /* pnpm check optional */
  }

  // yarn
  try {
    const v = execSync('yarn -v 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which yarn 2>/dev/null', { encoding: 'utf8' }).trim();
    result.yarn = { isInstalled: true, version: v, path: p };
  } catch {
    /* yarn check optional */
  }

  // python3
  try {
    const v = execSync('python3 --version 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which python3 2>/dev/null', { encoding: 'utf8' }).trim();
    result.python = { isInstalled: true, version: v.replace('Python ', ''), path: p };
  } catch {
    /* python check optional */
  }

  // pip
  try {
    const v = execSync('python3 -m pip --version 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which pip3 2>/dev/null || which pip 2>/dev/null', { encoding: 'utf8' }).trim();
    result.pip = { isInstalled: true, version: v.split(' ')[1] || 'Installed', path: p || 'python3 -m pip' };
  } catch {
    /* pip check optional */
  }

  // git
  try {
    const v = execSync('git --version 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = execSync('which git 2>/dev/null', { encoding: 'utf8' }).trim();
    result.git = { isInstalled: true, version: v.replace('git version ', ''), path: p };
  } catch {
    /* git check optional */
  }

  return result;
}

// Native Folder Picker on macOS using AppleScript
function pickFolderNative(prompt, startingDir) {
  if (process.platform === 'darwin') {
    const cleanPrompt = (prompt || 'Select Project Location').replace(/["\\]/g, '');
    const defaultClause =
      startingDir && fs.existsSync(startingDir)
        ? `default location POSIX file "${startingDir.replace(/["\\]/g, '')}"`
        : `default location (path to desktop folder)`;
    const appleScript = `POSIX path of (choose folder with prompt "${cleanPrompt}" ${defaultClause})`;

    try {
      const out = execSync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf8',
        timeout: 120000,
      }).trim();

      const cleanPath = out.replace(/\/+$/, '') || '/';
      const validation = validateProjectPath(cleanPath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      writeAuditLog('PICK_FOLDER_SUCCESS', { path: cleanPath });
      return {
        success: true,
        path: cleanPath,
        isGitRepo: validation.isGitRepo,
        exists: true,
      };
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('User canceled') || msg.includes('-128')) {
        return { success: false, cancelled: true, message: 'User cancelled folder selection.' };
      }
      return { success: false, error: msg };
    }
  }

  return {
    success: false,
    error: 'Native folder dialog is only supported on macOS desktop.',
  };
}

// Inspect existing or new project directory
function inspectProject(projectPath) {
  const validation = validateProjectPath(projectPath);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  const resolved = validation.resolvedPath;
  const isGitRepo = fs.existsSync(path.join(resolved, '.git'));
  const packageJsonPath = path.join(resolved, 'package.json');
  const reqTxtPath = path.join(resolved, 'requirements.txt');
  const pyprojectPath = path.join(resolved, 'pyproject.toml');

  let hasPackageJson = fs.existsSync(packageJsonPath);
  let packageJson = undefined;
  let dependencies = [];
  let devDependencies = [];
  let detectedFramework = 'none';
  let detectedLanguage = 'unknown';
  let detectedPackageManager = 'npm';

  if (hasPackageJson) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      dependencies = Object.keys(packageJson.dependencies || {});
      devDependencies = Object.keys(packageJson.devDependencies || {});

      const allDeps = [...dependencies, ...devDependencies].join(' ').toLowerCase();
      if (allDeps.includes('react')) detectedFramework = 'react';
      else if (allDeps.includes('next')) detectedFramework = 'next';
      else if (allDeps.includes('vue')) detectedFramework = 'vue';
      else if (allDeps.includes('express')) detectedFramework = 'express';
      else detectedFramework = 'node';

      if (fs.existsSync(path.join(resolved, 'tsconfig.json')) || allDeps.includes('typescript')) {
        detectedLanguage = 'typescript';
      } else {
        detectedLanguage = 'javascript';
      }

      if (fs.existsSync(path.join(resolved, 'pnpm-lock.yaml'))) detectedPackageManager = 'pnpm';
      else if (fs.existsSync(path.join(resolved, 'yarn.lock'))) detectedPackageManager = 'yarn';
      else detectedPackageManager = 'npm';
    } catch {
      hasPackageJson = false;
    }
  }

  const hasRequirementsTxt = fs.existsSync(reqTxtPath);
  const hasPyproject = fs.existsSync(pyprojectPath);
  if (hasRequirementsTxt || hasPyproject) {
    detectedLanguage = 'python';
    detectedFramework = 'python';
    detectedPackageManager = 'pip';
  }

  let fileCount = 0;
  let specialFiles = [];
  try {
    const entries = fs.readdirSync(resolved);
    fileCount = entries.length;
    specialFiles = entries.filter((e) =>
      ['CLAUDE.md', '.cursorrules', 'AGENTS.md', 'README.md', 'tsconfig.json', 'vite.config.ts'].includes(e)
    );
  } catch {
    /* directory entries read failed */
  }

  return {
    valid: true,
    inspection: {
      projectPath: resolved,
      exists: true,
      isGitRepo,
      hasPackageJson,
      hasRequirementsTxt,
      hasPyproject,
      packageJson,
      detectedFramework,
      detectedLanguage,
      detectedPackageManager,
      dependencies,
      devDependencies,
      specialFiles,
      fileCount,
    },
  };
}

// Create new project directory safely
function createProjectDirectory(parentDir, folderName) {
  const parentVal = validateProjectPath(parentDir);
  if (!parentVal.valid) {
    return { success: false, error: parentVal.error };
  }

  if (!folderName || typeof folderName !== 'string') {
    return { success: false, error: 'Folder name is required.' };
  }

  const cleanFolderName = folderName.replace(/[\r\n]+/g, '');
  if (!cleanFolderName.trim()) {
    return { success: false, error: 'Folder name cannot be empty.' };
  }

  if (cleanFolderName.includes('/') || cleanFolderName.includes('\\') || cleanFolderName.includes('..')) {
    return { success: false, error: 'Folder name cannot contain path separators or directory traversal.' };
  }

  if (['.', '..', '.git', 'node_modules'].includes(cleanFolderName.trim())) {
    return { success: false, error: `Folder name "${cleanFolderName.trim()}" is reserved.` };
  }

  const destPath = path.join(parentVal.resolvedPath, cleanFolderName);
  if (fs.existsSync(destPath)) {
    return { success: false, error: `Destination already exists: ${destPath}`, alreadyExists: true };
  }

  try {
    fs.mkdirSync(destPath, { mode: 0o755, recursive: false });
    writeAuditLog('CREATE_PROJECT_DIR', { projectPath: destPath });
    return { success: true, projectPath: destPath };
  } catch (err) {
    return { success: false, error: `Failed to create directory: ${err.message}` };
  }
}

// Scaffolds approved template files into empty project directory
function initializeTemplateFiles(projectPath, templateId, projectName, initGit) {
  const validation = validateProjectPath(projectPath);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const targetDir = validation.resolvedPath;
  const safeName = (projectName || path.basename(targetDir)).replace(/[^a-zA-Z0-9_.-]/g, '-');
  const createdFiles = [];

  const writeProjectFile = (relPath, content) => {
    const full = path.join(targetDir, relPath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(full, content, 'utf8');
    createdFiles.push(relPath);
  };

  switch (templateId) {
    case 'react-vite-ts': {
      writeProjectFile(
        'package.json',
        JSON.stringify(
          {
            name: safeName.toLowerCase(),
            private: true,
            version: '0.1.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc -b && vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.3.1',
              'react-dom': '^18.3.1',
              'lucide-react': '^0.460.0',
            },
            devDependencies: {
              '@types/react': '^18.3.12',
              '@types/react-dom': '^18.3.1',
              '@vitejs/plugin-react': '^4.3.3',
              typescript: '^5.6.3',
              vite: '^5.4.10',
            },
          },
          null,
          2
        )
      );

      writeProjectFile(
        'vite.config.ts',
        `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`
      );

      writeProjectFile(
        'tsconfig.json',
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              useDefineForClassFields: true,
              lib: ['ES2020', 'DOM', 'DOM.Iterable'],
              module: 'ESNext',
              skipLibCheck: true,
              moduleResolution: 'bundler',
              allowImportingTsExtensions: true,
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: 'react-jsx',
              strict: true,
              noUnusedLocals: true,
              noUnusedParameters: true,
              noFallthroughCasesInSwitch: true,
            },
            include: ['src'],
          },
          null,
          2
        )
      );

      writeProjectFile(
        'index.html',
        `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${safeName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`
      );

      writeProjectFile(
        'src/main.tsx',
        `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
      );

      writeProjectFile(
        'src/App.tsx',
        `import React from 'react';\n\nexport default function App() {\n  return (\n    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2.5rem', maxWidth: '700px', margin: '0 auto' }}>\n      <header>\n        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>${safeName}</h1>\n        <p style={{ color: '#888' }}>Initialized by Deadline Execution Protocol. Ready to build.</p>\n      </header>\n    </main>\n  );\n}\n`
      );

      writeProjectFile(
        'src/index.css',
        `body {\n  margin: 0;\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background-color: #0f172a;\n  color: #f8fafc;\n}\n`
      );

      writeProjectFile('.gitignore', `node_modules\ndist\n.DS_Store\n`);
      break;
    }

    case 'react-vite-js': {
      writeProjectFile(
        'package.json',
        JSON.stringify(
          {
            name: safeName.toLowerCase(),
            private: true,
            version: '0.1.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.3.1',
              'react-dom': '^18.3.1',
              'lucide-react': '^0.460.0',
            },
            devDependencies: {
              '@vitejs/plugin-react': '^4.3.3',
              vite: '^5.4.10',
            },
          },
          null,
          2
        )
      );

      writeProjectFile(
        'vite.config.js',
        `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`
      );

      writeProjectFile(
        'index.html',
        `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${safeName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`
      );

      writeProjectFile(
        'src/main.jsx',
        `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
      );

      writeProjectFile(
        'src/App.jsx',
        `import React from 'react';\n\nexport default function App() {\n  return (\n    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2.5rem', maxWidth: '700px', margin: '0 auto' }}>\n      <h1>${safeName}</h1>\n      <p>Initialized by Deadline. Ready to build.</p>\n    </main>\n  );\n}\n`
      );

      writeProjectFile('src/index.css', `body { margin: 0; background: #0f172a; color: #f8fafc; }\n`);
      writeProjectFile('.gitignore', `node_modules\ndist\n.DS_Store\n`);
      break;
    }

    case 'node-ts':
    case 'node-api': {
      writeProjectFile(
        'package.json',
        JSON.stringify(
          {
            name: safeName.toLowerCase(),
            version: '0.1.0',
            main: 'dist/index.js',
            type: 'module',
            scripts: {
              build: 'tsc',
              start: 'node dist/index.js',
            },
            dependencies: templateId === 'node-api' ? { express: '^4.21.1', cors: '^2.8.5' } : {},
            devDependencies: {
              typescript: '^5.6.3',
              '@types/node': '^20.17.6',
            },
          },
          null,
          2
        )
      );

      writeProjectFile(
        'tsconfig.json',
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src/**/*'],
          },
          null,
          2
        )
      );

      writeProjectFile(
        'src/index.ts',
        `console.info('Starting ${safeName}...');\n`
      );

      writeProjectFile('.gitignore', `node_modules\ndist\n.DS_Store\n`);
      break;
    }

    case 'python-app': {
      writeProjectFile('requirements.txt', `pytest>=8.0.0\n`);
      writeProjectFile(
        'main.py',
        `def main():\n    print("Running ${safeName}")\n\nif __name__ == "__main__":\n    main()\n`
      );
      writeProjectFile(
        'test_main.py',
        `def test_smoke():\n    assert True\n`
      );
      writeProjectFile('.gitignore', `__pycache__\n*.pyc\n.pytest_cache\nvenv\n.env\n`);
      break;
    }

    default: {
      writeProjectFile(
        'README.md',
        `# ${safeName}\n\nProject initialized by Deadline execution management system.\n`
      );
      writeProjectFile('.gitignore', `node_modules\n.DS_Store\n`);
      break;
    }
  }

  // Optional Git init
  if (initGit) {
    try {
      spawnSync('git', ['init'], { cwd: targetDir, timeout: 5000 });
      createdFiles.push('.git');
    } catch {
      /* git init optional */
    }
  }

  writeAuditLog('INIT_TEMPLATE', { projectPath: targetDir, template: templateId, files: createdFiles });
  return { success: true, createdFiles, template: templateId };
}

// Executes dependency install with safety validations
function runDependencyInstall(projectPath, packageManager, packages = []) {
  const validation = validateProjectPath(projectPath);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const targetDir = validation.resolvedPath;
  const pm = packageManager || 'npm';

  let bin;
  let args;

  if (pm === 'pnpm') {
    bin = 'pnpm';
    args = packages.length > 0 ? ['add', ...packages] : ['install'];
  } else if (pm === 'yarn') {
    bin = 'yarn';
    args = packages.length > 0 ? ['add', ...packages] : ['install'];
  } else if (pm === 'pip') {
    bin = 'python3';
    args = packages.length > 0
      ? ['-m', 'pip', 'install', ...packages]
      : ['-m', 'pip', 'install', '-r', 'requirements.txt'];
  } else {
    bin = 'npm';
    args = packages.length > 0 ? ['install', ...packages] : ['install'];
  }

  const run = spawnSync(bin, args, {
    cwd: targetDir,
    encoding: 'utf8',
    timeout: 180000, // 3 minutes
  });

  const stdout = (run.stdout || '').trim();
  const stderr = (run.stderr || '').trim();
  const exitCode = run.status ?? (run.error ? 1 : 0);

  writeAuditLog('INSTALL_DEPS', { projectPath: targetDir, packageManager: pm, exitCode });

  return {
    success: exitCode === 0,
    stdout,
    stderr,
    exitCode,
    error: exitCode !== 0 ? stderr || stdout || 'Dependency installation failed.' : undefined,
  };
}

// Verifies project environment readiness
function verifyProjectEnv(projectPath, validationCommand) {
  const validation = validateProjectPath(projectPath);
  if (!validation.valid) {
    return {
      projectPath,
      isReady: false,
      directoryExists: false,
      manifestExists: false,
      dependenciesInstalled: false,
      gitInitialized: false,
      buildCheckPassed: false,
      issues: [validation.error || 'Invalid project path'],
      verifiedAt: new Date().toISOString(),
    };
  }

  const targetDir = validation.resolvedPath;
  const directoryExists = fs.existsSync(targetDir);
  const gitInitialized = fs.existsSync(path.join(targetDir, '.git'));
  const hasPkg = fs.existsSync(path.join(targetDir, 'package.json'));
  const hasReq = fs.existsSync(path.join(targetDir, 'requirements.txt'));
  const manifestExists = hasPkg || hasReq;
  const hasNodeModules = fs.existsSync(path.join(targetDir, 'node_modules'));
  const dependenciesInstalled = hasNodeModules || hasReq;

  const issues = [];
  if (!directoryExists) issues.push('Project directory does not exist.');
  if (!manifestExists) issues.push('No project manifest (package.json or requirements.txt) found.');
  if (hasPkg && !hasNodeModules) issues.push('Dependencies are not installed (node_modules is missing).');

  let buildCheckPassed = true;
  let buildOutput = '';

  if (validationCommand && manifestExists) {
    try {
      const parts = validationCommand.split(' ');
      const check = spawnSync(parts[0], parts.slice(1), {
        cwd: targetDir,
        encoding: 'utf8',
        timeout: 60000,
      });
      buildOutput = (check.stdout || check.stderr || '').trim();
      buildCheckPassed = check.status === 0;
      if (!buildCheckPassed) {
        issues.push(`Validation command "${validationCommand}" returned exit code ${check.status}`);
      }
    } catch (err) {
      buildCheckPassed = false;
      issues.push(`Failed to run validation command: ${err.message}`);
    }
  }

  const isReady = directoryExists && manifestExists && issues.length === 0;

  return {
    projectPath: targetDir,
    isReady,
    directoryExists,
    manifestExists,
    dependenciesInstalled,
    gitInitialized,
    buildCheckPassed,
    buildOutput,
    issues,
    verifiedAt: new Date().toISOString(),
  };
}

// CORS & Auth Checker
function checkSecurity(req, res) {
  // 1. Origin header validation
  const origin = req.headers['origin'];
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Origin "${origin}" is not authorized to access Deadline bridge.` }));
      return false;
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Preflight OPTIONS handling
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return false;
  }

  // Unprotected health check and pair endpoint
  if (req.url === '/health' && req.method === 'GET') {
    return true;
  }
  if ((req.url === '/auth/pair' || req.url?.startsWith('/auth/pair?')) && req.method === 'POST') {
    return true;
  }

  // Authentication check
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || token !== pairingToken) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing pairing token.' }));
    return false;
  }

  return true;
}

// Read JSON Body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  if (!checkSecurity(req, res)) {
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  // 1. GET /health
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        version: '1.0.0-phase3',
        port: PORT,
        host: HOST,
        platform: process.platform,
      })
    );
    return;
  }

  // 2. POST /auth/pair
  if (pathname === '/auth/pair' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const token = (body.token || '').trim();
      if (token === pairingToken) {
        writeAuditLog('PAIR_SUCCESS', { remoteAddress: req.socket.remoteAddress });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Paired successfully with Deadline Local Bridge.' }));
      } else {
        writeAuditLog('PAIR_FAILED', { remoteAddress: req.socket.remoteAddress });
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid pairing token.' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 3. GET /providers/detect
  if (pathname === '/providers/detect' && req.method === 'GET') {
    const providers = detectAllProviders();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ providers }));
    return;
  }

  // 4. POST /workspace/validate-path
  if (pathname === '/workspace/validate-path' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const validation = validateProjectPath(body.projectPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(validation));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: e.message }));
    }
    return;
  }

  // 5. POST /workspace/prepare-handoff
  if (pathname === '/workspace/prepare-handoff' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const validation = validateProjectPath(body.projectPath);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: validation.error }));
        return;
      }

      const projectPath = validation.resolvedPath;
      const targetFileName = body.fileName || 'DEADLINE_CONTEXT.md';
      const targetFilePath = path.join(projectPath, targetFileName);

      // Detect existing special instruction files in project
      const specialFiles = ['CLAUDE.md', '.cursorrules', 'AGENTS.md', 'GEMINI.md'];
      const detectedSpecial = specialFiles.filter((f) => fs.existsSync(path.join(projectPath, f)));

      const existedBefore = fs.existsSync(targetFilePath);
      fs.writeFileSync(targetFilePath, body.content || '', 'utf8');

      writeAuditLog('PREPARE_HANDOFF', { projectPath, filePath: targetFilePath });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          filePath: targetFilePath,
          created: !existedBefore,
          existingFileOverwritten: existedBefore,
          existingSpecialFilesDetected: detectedSpecial,
        })
      );
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 6. POST /execute/launch
  if (pathname === '/execute/launch' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const validation = validateProjectPath(body.projectPath);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: validation.error }));
        return;
      }

      const projectPath = validation.resolvedPath;
      const providerId = body.providerId;
      const sessionId = `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const providers = detectAllProviders();
      const detected = providers[providerId];

      if (!detected || !detected.isInstalled) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `${providerId} is not detected as installed.` }));
        return;
      }

      let launchedPid = undefined;
      let status = 'running';
      let message = '';
      let commandSummary = '';

      // macOS Interactive Terminal execution for CLI coding agents (Claude Code, Codex)
      if (process.platform === 'darwin' && body.interactive) {
        const bin = detected.binaryPath;
        const argString = (body.args || []).map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ');
        const shellCmd = `cd "${projectPath.replace(/"/g, '\\"')}" && "${bin.replace(/"/g, '\\"')}" ${argString}`;
        commandSummary = `${bin} ${argString}`;

        const appleScript = `tell application "Terminal"
          activate
          do script "${shellCmd.replace(/"/g, '\\"')}"
        end tell`;

        const osascript = spawn('osascript', ['-e', appleScript]);
        launchedPid = osascript.pid;
        status = 'running';
        message = `Launched ${providerId} in interactive Terminal at ${projectPath}`;
      } else if (process.platform === 'darwin' && !body.interactive) {
        // macOS GUI IDE launch (Antigravity, Cursor, VS Code, Windsurf)
        const appPath = detected.appPath;
        const bin = detected.binaryPath;
        const contextFilePath = path.join(projectPath, 'DEADLINE_CONTEXT.md');

        if (bin && fs.existsSync(bin)) {
          const child = spawn(bin, [projectPath, contextFilePath], {
            detached: true,
            stdio: 'ignore',
            cwd: projectPath,
          });
          child.unref();
          launchedPid = child.pid;
          commandSummary = `${bin} "${projectPath}"`;
        } else if (appPath && fs.existsSync(appPath)) {
          const child = spawn('open', ['-a', appPath, projectPath, contextFilePath], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          launchedPid = child.pid;
          commandSummary = `open -a "${appPath}" "${projectPath}"`;
        }
        status = 'externally_managed';
        message = `Opened workspace in ${providerId} at ${projectPath}`;
      } else {
        // Fallback Linux/Cross-platform spawn
        const bin = detected.binaryPath || body.command;
        const child = spawn(bin, body.args || [projectPath], {
          cwd: projectPath,
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        launchedPid = child.pid;
        status = 'running';
        message = `Spawned process ${launchedPid} for ${providerId}`;
      }

      const sessionObj = {
        sessionId,
        providerId,
        projectPath,
        startedAt: new Date().toISOString(),
        processId: launchedPid,
        status,
      };
      activeSessions.set(sessionId, sessionObj);

      writeAuditLog('LAUNCH_IDE', { sessionId, providerId, projectPath, pid: launchedPid });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          sessionId,
          providerId,
          status,
          processId: launchedPid,
          launchCommandSummary: commandSummary,
          message,
        })
      );
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 7. GET /execute/session/:id
  if (pathname.startsWith('/execute/session/') && req.method === 'GET') {
    const sessionId = pathname.replace('/execute/session/', '');
    const session = activeSessions.get(sessionId);
    const pid = session?.processId || parseInt(url.searchParams.get('pid') || '0', 10);

    let isAlive = false;
    if (pid && pid > 0) {
      try {
        process.kill(pid, 0); // signal 0 tests liveness without killing
        isAlive = true;
      } catch {
        isAlive = false;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        sessionId,
        isAlive,
        status: isAlive ? session?.status || 'running' : 'completed',
      })
    );
    return;
  }

  // 8. POST /execute/stop/:id
  if (pathname.startsWith('/execute/stop/') && req.method === 'POST') {
    try {
      const sessionId = pathname.replace('/execute/stop/', '');
      const body = await parseBody(req);
      const session = activeSessions.get(sessionId);
      const pid = body.pid || session?.processId;

      let stopped = false;
      if (pid && pid > 0) {
        try {
          process.kill(pid, 'SIGTERM');
          stopped = true;
        } catch {
          stopped = false;
        }
      }

      if (session) {
        session.status = 'cancelled';
        session.endedAt = new Date().toISOString();
      }

      writeAuditLog('STOP_SESSION', { sessionId, pid, stopped });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, stopped }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 9. POST /workspace/verify-changes
  if (pathname === '/workspace/verify-changes' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const validation = validateProjectPath(body.projectPath);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ isGitRepo: false, modifiedFiles: [], untrackedFiles: [], deletedFiles: [], totalChanges: 0, summary: validation.error }));
        return;
      }

      const projectPath = validation.resolvedPath;
      if (!fs.existsSync(path.join(projectPath, '.git'))) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isGitRepo: false,
          modifiedFiles: [],
          untrackedFiles: [],
          deletedFiles: [],
          totalChanges: 0,
          summary: 'Directory is not a Git repository. Direct file inspection only.',
        }));
        return;
      }

      const gitOutput = spawnSync('git', ['status', '--porcelain'], {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 4000,
      });

      const rawLines = (gitOutput.stdout || '').split('\n').filter((l) => l.trim().length > 0);
      const modifiedFiles = [];
      const untrackedFiles = [];
      const deletedFiles = [];

      for (const line of rawLines) {
        const match = line.match(/^(.{2})\s+(.+)$/);
        if (!match) continue;
        const code = match[1].trim();
        const file = match[2].trim();
        if (code === 'M' || code === 'MM') modifiedFiles.push(file);
        else if (code === '??') untrackedFiles.push(file);
        else if (code === 'D') deletedFiles.push(file);
        else modifiedFiles.push(file);
      }

      const totalChanges = rawLines.length;
      const summary = totalChanges === 0
        ? 'Working tree clean. No uncommitted file modifications.'
        : `${totalChanges} file change(s) detected: ${modifiedFiles.length} modified, ${untrackedFiles.length} new, ${deletedFiles.length} deleted.`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          isGitRepo: true,
          modifiedFiles,
          untrackedFiles,
          deletedFiles,
          totalChanges,
          summary,
        })
      );
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ isGitRepo: false, modifiedFiles: [], untrackedFiles: [], deletedFiles: [], totalChanges: 0, summary: e.message }));
    }
    return;
  }

  // 10. GET /audit/logs
  if (pathname === '/audit/logs' && req.method === 'GET') {
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
        const parsed = lines.slice(-50).map((l) => JSON.parse(l));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ logs: parsed }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ logs: [] }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: [], error: e.message }));
    }
    return;
  }

  // 11. POST /workspace/pick-folder
  if (pathname === '/workspace/pick-folder' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = pickFolderNative(body.prompt, body.startingDirectory);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 12. GET /system/runtimes
  if (pathname === '/system/runtimes' && req.method === 'GET') {
    try {
      const runtimes = detectRuntimes();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ runtimes }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 13. POST /project/inspect
  if (pathname === '/project/inspect' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const inspection = inspectProject(body.projectPath);
      res.writeHead(inspection.valid ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(inspection));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: e.message }));
    }
    return;
  }

  // 14. POST /project/create-directory
  if (pathname === '/project/create-directory' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const resData = createProjectDirectory(body.parentDirectory, body.folderName);
      res.writeHead(resData.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resData));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 15. POST /project/initialize-template
  if (pathname === '/project/initialize-template' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const resData = initializeTemplateFiles(
        body.projectPath,
        body.templateId,
        body.projectName,
        body.initGit !== false
      );
      res.writeHead(resData.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resData));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 16. POST /project/install-dependencies
  if (pathname === '/project/install-dependencies' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const resData = runDependencyInstall(
        body.projectPath,
        body.packageManager,
        body.packages || []
      );
      res.writeHead(resData.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resData));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 17. POST /project/verify-environment
  if (pathname === '/project/verify-environment' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const report = verifyProjectEnv(body.projectPath, body.validationCommand);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(report));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ isReady: false, error: e.message }));
    }
    return;
  }

  // Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `Not found: ${pathname}` }));
});

server.listen(PORT, HOST, () => {
  console.info(`
==========================================================
⚡ Deadline Local Execution Bridge Online
==========================================================
Host:              ${HOST}
Port:              ${PORT}
Pairing Secret:    ${pairingToken}
Audit Log:         ${AUDIT_LOG_FILE}
Security:          Loopback-only, Origin-protected, 256-bit token
==========================================================
`);
  writeAuditLog('BRIDGE_STARTUP', { host: HOST, port: PORT });
});

// Graceful termination
process.on('SIGINT', () => {
  writeAuditLog('BRIDGE_SHUTDOWN', { reason: 'SIGINT' });
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  writeAuditLog('BRIDGE_SHUTDOWN', { reason: 'SIGTERM' });
  server.close(() => process.exit(0));
});
