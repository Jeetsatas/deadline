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
