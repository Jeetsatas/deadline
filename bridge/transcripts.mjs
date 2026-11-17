import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MAX_TRANSCRIPT_BYTES = 64 * 1024 * 1024;

function encodedClaudeProjectPath(projectPath) {
  return projectPath.replaceAll(path.sep, '-');
}

function readProjectCwd(filePath) {
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    for (const line of contents.split('\n').slice(0, 80)) {
      try {
        const record = JSON.parse(line);
        const cwd = record?.payload?.cwd || record?.cwd || record?.payload?.working_directory;
        if (typeof cwd === 'string' && path.isAbsolute(cwd)) return path.resolve(cwd);
      } catch {
        // Skip malformed or partial records while looking for session metadata.
      }
    }
  } catch {
    return null;
  }
  return null;
}

function belongsToProject(filePath, projectPath, providerId) {
  const cwd = readProjectCwd(filePath);
  if (cwd === projectPath || Boolean(cwd && cwd.startsWith(projectPath + path.sep))) return true;
  // Codex sessions are often launched from a monorepo root while editing a
  // nested app. Include only nearby ancestor sessions that explicitly mention
  // this project folder, so unrelated sessions from that root are not swept in.
  if (providerId !== 'codex' || !cwd || !projectPath.startsWith(cwd + path.sep)) return false;
  const relativeProject = path.relative(cwd, projectPath);
  if (!relativeProject || relativeProject.startsWith('..') || relativeProject.split(path.sep).length > 2) return false;
  try {
    const sessionText = fs.readFileSync(filePath, 'utf8');
    return sessionText.includes(relativeProject) || sessionText.includes(path.basename(projectPath));
  } catch {
    return false;
  }
}

function walkJsonl(root, maxDepth = 5) {
  const found = [];
  const visit = (dir, depth) => {
    if (depth > maxDepth || found.length >= 2000) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(fullPath, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(fullPath);
    }
  };
  visit(root, 0);
  return found;
}

function fileMetadata(filePath, providerId) {
  const stat = fs.statSync(filePath);
  const basename = path.basename(filePath);
  const id = providerId === 'codex' ? basename.replace(/^rollout-/, '').replace(/\.jsonl$/, '') : basename.replace(/\.jsonl$/, '');
  return {
    id,
    providerId,
    sourceName: basename,
    startedAt: stat.birthtime.toISOString(),
    updatedAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
  };
}

export function discoverProjectTranscripts(projectPath, providerId) {
  if (!['codex', 'claude_code'].includes(providerId)) {
    return { sessions: [], message: 'Automatic transcript discovery is available for Codex CLI and Claude Code. Import an exported transcript for other IDEs.' };
  }
  const home = os.homedir();
  const sourceRoot = providerId === 'codex'
    ? path.join(home, '.codex', 'sessions')
    : path.join(home, '.claude', 'projects', encodedClaudeProjectPath(projectPath));
  const files = walkJsonl(sourceRoot);
  const sessions = files
    .filter((filePath) => belongsToProject(filePath, projectPath, providerId))
    .map((filePath) => ({ ...fileMetadata(filePath, providerId), path: filePath }))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return { sessions };
}

export function readProjectTranscript(projectPath, providerId, sessionId) {
  const { sessions } = discoverProjectTranscripts(projectPath, providerId);
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (!session) return { success: false, error: 'Transcript was not found for this approved project directory.' };
  const stat = fs.statSync(session.path);
  if (!stat.isFile() || stat.size > MAX_TRANSCRIPT_BYTES) {
    return { success: false, error: 'Transcript exceeds the 64 MB import limit or is not a regular file.' };
  }
  try {
    const raw = fs.readFileSync(session.path, 'utf8');
    const messages = [];
    const contentText = (value) => {
      if (typeof value === 'string') return value;
      if (!Array.isArray(value)) return '';
      return value.map((part) => typeof part === 'string' ? part : part && typeof part === 'object'
        ? (typeof part.text === 'string' ? part.text : typeof part.output_text === 'string' ? part.output_text : '')
        : '').filter(Boolean).join('\n');
    };
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      const payload = record?.payload && typeof record.payload === 'object' ? record.payload : record;
      const type = String(payload.type || record.type || '');
      const timestamp = typeof record.timestamp === 'string' ? record.timestamp : undefined;
      if (providerId === 'codex') {
        if (type === 'message' && (payload.role === 'user' || payload.role === 'assistant')) {
          const text = contentText(payload.content);
          if (text.trim()) messages.push({ role: payload.role, text, timestamp });
        } else if (['function_call', 'custom_tool_call', 'tool_call'].includes(type)) {
          const input = payload.arguments ?? payload.input ?? '';
          const text = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
          messages.push({ role: 'tool', toolName: String(payload.name || payload.tool_name || 'Tool call'), text, timestamp });
        } else if (type.includes('output') || type === 'tool_result') {
          const output = payload.output ?? payload.result ?? payload.content ?? '';
          const text = contentText(output) || (typeof output === 'string' ? output : JSON.stringify(output, null, 2));
          if (text.trim()) messages.push({ role: 'tool', toolName: 'Tool result', text, timestamp });
        }
      } else if ((record.type === 'user' || record.type === 'assistant') && record.message && typeof record.message === 'object') {
        const message = record.message;
        const role = message.role === 'user' || record.type === 'user' ? 'user' : 'assistant';
        if (typeof message.content === 'string' && message.content.trim()) messages.push({ role, text: message.content, timestamp });
        else if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) messages.push({ role, text: part.text, timestamp });
            else if (part?.type === 'tool_use') messages.push({ role: 'tool', toolName: String(part.name || 'Tool call'), text: JSON.stringify(part.input ?? '', null, 2), timestamp });
            else if (part?.type === 'tool_result') {
              const text = contentText(part.content);
              if (text) messages.push({ role: 'tool', toolName: 'Tool result', text, timestamp });
            }
          }
        }
      }
    }
    return { success: true, messages, session: { ...session, path: undefined } };
  } catch {
    return { success: false, error: 'Transcript could not be read.' };
  }
}
