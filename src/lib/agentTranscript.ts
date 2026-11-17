import type { IDEProviderId } from '@/core/ide/types';

export interface AgentTranscriptMessage {
  role: 'user' | 'assistant' | 'tool' | 'transcript';
  text: string;
  toolName?: string;
  timestamp?: string;
}

export interface AgentTranscript {
  id: string;
  deadlineId: string;
  providerId: IDEProviderId | 'imported';
  sessionId: string;
  sourceName: string;
  startedAt: string;
  importedAt: string;
  messages: AgentTranscriptMessage[];
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    const item = part as Record<string, unknown>;
    if (typeof item.text === 'string') return item.text;
    if (typeof item.output_text === 'string') return item.output_text;
    return '';
  }).filter(Boolean).join('\n');
}

function parseClaudeRecord(record: Record<string, unknown>, messages: AgentTranscriptMessage[]): void {
  if (record.type !== 'user' && record.type !== 'assistant') return;
  const message = (record.message && typeof record.message === 'object' ? record.message : record) as Record<string, unknown>;
  const role = (message.role === 'user' || record.type === 'user') ? 'user' : 'assistant';
  const content = message.content;
  const timestamp = typeof record.timestamp === 'string' ? record.timestamp : undefined;
  if (typeof content === 'string') {
    if (content.trim()) messages.push({ role, text: content, timestamp });
    return;
  }
  if (!Array.isArray(content)) return;
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    const block = part as Record<string, unknown>;
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      messages.push({ role, text: block.text, timestamp });
    } else if (block.type === 'tool_use') {
      const input = block.input && typeof block.input === 'object' ? JSON.stringify(block.input, null, 2) : String(block.input || '');
      messages.push({ role: 'tool', toolName: String(block.name || 'Tool call'), text: input, timestamp });
    } else if (block.type === 'tool_result') {
      const resultText = textFromContent(block.content) || (typeof block.output === 'string' ? block.output : '');
      if (resultText) messages.push({ role: 'tool', toolName: 'Tool result', text: resultText, timestamp });
    }
    // Deliberately omit hidden reasoning blocks; capture conversation and actions, not private chain-of-thought.
  }
}

function parseCodexRecord(record: Record<string, unknown>, messages: AgentTranscriptMessage[]): void {
  const payload = (record.payload && typeof record.payload === 'object' ? record.payload : record) as Record<string, unknown>;
  const timestamp = typeof record.timestamp === 'string' ? record.timestamp : undefined;
  const type = String(payload.type || '');
  if (type === 'message' && (payload.role === 'user' || payload.role === 'assistant')) {
    const text = textFromContent(payload.content);
    if (text.trim()) messages.push({ role: payload.role, text, timestamp });
  } else if (['function_call', 'custom_tool_call', 'tool_call'].includes(type)) {
    const args = payload.arguments ?? payload.input ?? '';
    const text = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
    messages.push({ role: 'tool', toolName: String(payload.name || payload.tool_name || 'Tool call'), text, timestamp });
  } else if (type.includes('output') || type === 'tool_result') {
    const output = payload.output ?? payload.result ?? payload.content ?? '';
    const text = textFromContent(output) || (typeof output === 'string' ? output : JSON.stringify(output, null, 2));
    if (text.trim()) messages.push({ role: 'tool', toolName: 'Tool result', text, timestamp });
  }
}

export function parseAgentTranscript(raw: string, providerId: IDEProviderId | 'imported'): AgentTranscriptMessage[] {
  const messages: AgentTranscriptMessage[] = [];
  const records = raw.split(/\r?\n/).filter((line) => line.trim());
  let parsedCount = 0;
  for (const line of records) {
    try {
      const record = JSON.parse(line) as Record<string, unknown>;
      parsedCount += 1;
      if (providerId === 'claude_code') parseClaudeRecord(record, messages);
      else if (providerId === 'codex') parseCodexRecord(record, messages);
      else {
        if (record.type === 'user' || record.type === 'assistant') {
          parseClaudeRecord(record, messages);
        } else if (record.payload && typeof record.payload === 'object') {
          parseCodexRecord(record, messages);
        } else {
          const text = textFromContent(record.text ?? record.content ?? record.message);
          const role = record.role === 'user' || record.role === 'assistant' ? record.role : 'transcript';
          if (text.trim()) messages.push({ role, text, timestamp: typeof record.timestamp === 'string' ? record.timestamp : undefined });
        }
      }
    } catch {
      if (providerId === 'imported') messages.push({ role: 'transcript', text: line });
    }
  }
  if ((parsedCount === 0 || messages.length === 0) && raw.trim()) messages.push({ role: 'transcript', text: raw });
  return messages;
}

const DB_NAME = 'deadline-crisis-intelligence';
const STORE_NAME = 'agent-transcripts';
let databasePromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Local transcript storage is unavailable in this browser.'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('deadlineId', 'deadlineId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local transcript storage.'));
    });
  }
  return databasePromise;
}

export async function saveAgentTranscript(transcript: AgentTranscript): Promise<void> {
  const db = await getDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(transcript);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not save transcript.'));
  });
}

export async function getDeadlineTranscripts(deadlineId: string): Promise<AgentTranscript[]> {
  const db = await getDatabase();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('deadlineId').getAll(deadlineId);
    request.onsuccess = () => resolve((request.result as AgentTranscript[]).sort((a, b) => a.startedAt.localeCompare(b.startedAt)));
    request.onerror = () => reject(request.error || new Error('Could not load transcripts.'));
  });
}

export async function removeAgentTranscript(id: string): Promise<void> {
  const db = await getDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not remove transcript.'));
  });
}

export function formatTranscriptMarkdown(transcript: AgentTranscript): string {
  return transcript.messages.map((message) => {
    const speaker = message.role === 'tool' ? `Tool: ${message.toolName || 'action'}` : message.role[0].toUpperCase() + message.role.slice(1);
    const time = message.timestamp ? ` · ${new Date(message.timestamp).toLocaleString()}` : '';
    return `#### ${speaker}${time}\n\n${message.text}`;
  }).join('\n\n');
}
