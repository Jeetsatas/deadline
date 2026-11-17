import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Deadline } from '@/types';
import type { IDETranscriptSession } from '@/core/ide/types';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { localBridgeClient } from '@/core/ide/bridge/LocalBridgeClient';
import { ideProviderRegistry } from '@/core/ide/IDEProviderRegistry';
import { buildCrisisReport, buildReusableAgentPrompt } from '@/lib/crisisIntelligence';
import type { AgentTranscript } from '@/lib/agentTranscript';
import {
  getDeadlineTranscripts,
  parseAgentTranscript,
  removeAgentTranscript,
  saveAgentTranscript,
} from '@/lib/agentTranscript';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Clipboard, Download, FileText, HardDriveDownload, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';

interface CrisisIntelligenceProps {
  deadline: Deadline;
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function downloadMarkdown(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameFor(title: string, suffix: string): string {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deadline';
  return `${slug}-${suffix}.md`;
}

export const CrisisIntelligence: React.FC<CrisisIntelligenceProps> = ({ deadline }) => {
  const {
    activities,
    activeExecutionSessions,
    projectConfigurations,
    environmentReports,
    workspaceChanges,
    bridgeStatus,
    bridgePort,
    updateCrisisNotes,
  } = useDeadlineStore();
  const [notes, setNotes] = useState(deadline.crisisImplementationNotes || '');
  const [savedState, setSavedState] = useState<'saved' | 'saving'>('saved');
  const [copyState, setCopyState] = useState<'report' | 'prompt' | null>(null);
  const [transcripts, setTranscripts] = useState<AgentTranscript[]>([]);
  const [sourceProvider, setSourceProvider] = useState<'codex' | 'claude_code'>('codex');
  const [availableSessions, setAvailableSessions] = useState<IDETranscriptSession[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [importingSessionId, setImportingSessionId] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);
  const [expandedTranscriptIds, setExpandedTranscriptIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(deadline.crisisImplementationNotes || '');
    setSavedState('saved');
  }, [deadline.id, deadline.crisisImplementationNotes]);

  useEffect(() => {
    if (notes === (deadline.crisisImplementationNotes || '')) return;
    setSavedState('saving');
    const timer = window.setTimeout(() => {
      void updateCrisisNotes(deadline.id, notes).then(() => setSavedState('saved'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [notes, deadline.id, deadline.crisisImplementationNotes, updateCrisisNotes]);

  const session = activeExecutionSessions[deadline.id];
  const projectConfig = projectConfigurations[deadline.id];
  const environment = environmentReports[deadline.id];
  const changes = workspaceChanges[deadline.id];
  // The selected path is a global workspace default and can belong to another
  // deadline. Only report a path tied to this deadline's session or config.
  const projectPath = session?.projectPath || projectConfig?.projectPath;
  const context = { deadline: { ...deadline, crisisImplementationNotes: notes }, activities, projectPath, session, projectConfig, environment, changes, conversations: transcripts };
  const reportPreview = useMemo(() => buildCrisisReport({ ...context, includeConversationBodies: false }), [deadline, activities, projectPath, session, projectConfig, environment, changes, notes, transcripts]);
  const prompt = useMemo(() => buildReusableAgentPrompt({ ...deadline, crisisImplementationNotes: notes }), [deadline, notes]);
  const providerLabel = session?.providerId || deadline.aiConfig?.providerId || transcripts[0]?.providerId;
  const providerName = providerLabel
    ? ideProviderRegistry.getProvider(providerLabel)?.metadata.displayName || providerLabel
    : 'Not recorded';

  const refreshTranscripts = async () => {
    const records = await getDeadlineTranscripts(deadline.id);
    setTranscripts(records);
  };

  useEffect(() => {
    void refreshTranscripts().catch((error: unknown) => {
      setTranscriptError(error instanceof Error ? error.message : 'Could not load saved conversations.');
    });
  }, [deadline.id]);

  const handleDiscover = async () => {
    setTranscriptError(null);
    setTranscriptNotice(null);
    setIsDiscovering(true);
    try {
      localBridgeClient.setPort(bridgePort);
      const result = await localBridgeClient.discoverTranscripts(projectPath, sourceProvider);
      setAvailableSessions(result.sessions);
      setTranscriptNotice(result.message || (result.sessions.length
        ? `Found ${result.sessions.length} saved conversation${result.sessions.length === 1 ? '' : 's'} for this project.`
        : 'No saved conversations found for this project folder.'));
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Could not discover IDE conversations.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleImportSession = async (item: IDETranscriptSession) => {
    setTranscriptError(null);
    setImportingSessionId(item.id);
    try {
      const result = await localBridgeClient.readTranscript(projectPath, sourceProvider, item.id);
      if (!result.success || !result.messages) throw new Error(result.error || 'Could not read conversation transcript.');
      const transcript: AgentTranscript = {
        id: `${deadline.id}:${sourceProvider}:${item.id}`,
        deadlineId: deadline.id,
        providerId: sourceProvider,
        sessionId: item.id,
        sourceName: item.sourceName,
        startedAt: item.startedAt,
        importedAt: new Date().toISOString(),
        messages: result.messages,
      };
      await saveAgentTranscript(transcript);
      await refreshTranscripts();
      setTranscriptNotice(`Imported ${transcript.messages.length} conversation entries from ${item.sourceName}.`);
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Could not import this conversation.');
    } finally {
      setImportingSessionId(null);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setTranscriptError(null);
    try {
      const raw = await file.text();
      const isStructured = /\.(jsonl|json)$/i.test(file.name);
      const messages = isStructured
        ? parseAgentTranscript(raw, 'imported')
        : [{ role: 'transcript' as const, text: raw }];
      const transcript: AgentTranscript = {
        id: `${deadline.id}:imported:${file.name}:${file.lastModified}`,
        deadlineId: deadline.id,
        providerId: 'imported',
        sessionId: `import_${file.lastModified}`,
        sourceName: file.name,
        startedAt: new Date(file.lastModified).toISOString(),
        importedAt: new Date().toISOString(),
        messages,
      };
      await saveAgentTranscript(transcript);
      await refreshTranscripts();
      setTranscriptNotice(`Imported ${messages.length} entries from ${file.name}.`);
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Could not import this transcript file.');
    }
  };

  const handleRemoveTranscript = async (id: string) => {
    await removeAgentTranscript(id);
    await refreshTranscripts();
  };

  const handleCopy = async (kind: 'report' | 'prompt', content: string) => {
    try {
      await copyToClipboard(content);
      setCopyState(kind);
      window.setTimeout(() => setCopyState(null), 1800);
    } catch {
      setCopyState(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Crisis Intelligence</span>
              <Badge status={deadline.status}>{deadline.status.replace(/_/g, ' ')}</Badge>
            </div>
            <h2 className="text-xl font-bold text-foreground">Build record & recovery brief</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Bring the full agent conversation, coding actions, milestone history, and deliverable into one reusable project report.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => downloadMarkdown(buildCrisisReport(context), filenameFor(deadline.title, 'crisis-intelligence'))}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export report
            </Button>
            <Button variant="primary" size="sm" onClick={() => downloadMarkdown(prompt, filenameFor(deadline.title, 'agent-prompt'))}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export prompt
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="border border-border bg-background p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">IDE / Agent</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{providerName}</p>
          </div>
          <div className="border border-border bg-background p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Session</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{session?.status || 'No session recorded'}</p>
          </div>
          <div className="border border-border bg-background p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deadline / milestones</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{deadline.progress}% delivered · {deadline.milestones.filter((milestone) => milestone.isCompleted).length}/{deadline.milestones.length} complete</p>
          </div>
          <div className="border border-border bg-background p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{deadline.deadlineDate} · {deadline.deadlineTime}</p>
          </div>
        </div>
      </section>

      <section className="border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HardDriveDownload className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Full agent conversation capture</h3>
              <Badge variant="subtle">{transcripts.length} attached</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sync saved Codex CLI or Claude Code sessions for this project, or import a transcript exported from another IDE. Captured conversations are stored locally and included in the report.
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">Project: {projectPath}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Transcript source"
              value={sourceProvider}
              onChange={(event) => setSourceProvider(event.target.value as 'codex' | 'claude_code')}
              className="h-9 border border-input bg-background px-2.5 text-xs text-foreground"
            >
              <option value="codex">Codex CLI</option>
              <option value="claude_code">Claude Code</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => void handleDiscover()} isLoading={isDiscovering} disabled={bridgeStatus !== 'connected' || isDiscovering}>
              <HardDriveDownload className="mr-1.5 h-3.5 w-3.5" /> Discover sessions
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,.jsonl,.json,text/plain,application/json"
              className="hidden"
              onChange={(event) => void handleFileImport(event)}
            />
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import transcript
            </Button>
          </div>
        </div>

        {bridgeStatus !== 'connected' && (
          <p className="border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
            Pair the local bridge in Settings → Local Bridge to discover sessions on this computer.
          </p>
        )}
        {transcriptError && <p role="alert" className="border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">{transcriptError}</p>}
        {transcriptNotice && <p className="border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">{transcriptNotice}</p>}

        {availableSessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saved sessions for this project</p>
            {availableSessions.map((item) => {
              const transcriptId = `${deadline.id}:${sourceProvider}:${item.id}`;
              const alreadyAttached = transcripts.some((transcript) => transcript.id === transcriptId);
              return (
                <div key={item.id} className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{item.sourceName}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(item.startedAt).toLocaleString()} · {(item.sizeBytes / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button variant={alreadyAttached ? 'secondary' : 'outline'} size="sm" disabled={alreadyAttached || importingSessionId === item.id} isLoading={importingSessionId === item.id} onClick={() => void handleImportSession(item)}>
                    {alreadyAttached ? 'Attached' : 'Attach full conversation'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {transcripts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Attached conversations in report</p>
            {transcripts.map((transcript) => (
              <details key={transcript.id} className="border border-border bg-background">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3" onClick={(event) => {
                  event.preventDefault();
                  setExpandedTranscriptIds((current) => {
                    const next = new Set(current);
                    if (next.has(transcript.id)) next.delete(transcript.id);
                    else next.add(transcript.id);
                    return next;
                  });
                }}>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-foreground">{transcript.providerId === 'imported' ? transcript.sourceName : `${ideProviderRegistry.getProvider(transcript.providerId)?.metadata.displayName || transcript.providerId} · ${transcript.sourceName}`}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{new Date(transcript.startedAt).toLocaleString()} · {transcript.messages.length} entries</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="icon" title="Remove attached conversation" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleRemoveTranscript(transcript.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </span>
                </summary>
                {expandedTranscriptIds.has(transcript.id) && <div className="max-h-[32rem] space-y-3 overflow-auto border-t border-border p-3">
                  {transcript.messages.map((message, index) => (
                    <div key={`${transcript.id}-${index}`} className="border-l-2 border-primary/40 pl-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{message.role === 'tool' ? `Tool · ${message.toolName || 'Action'}` : message.role}</p>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">{message.text}</pre>
                    </div>
                  ))}
                </div>}
              </details>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Crisis summary (.md)</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Full conversations and tool actions are included in the exported Markdown report. This preview keeps the page responsive.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleCopy('report', buildCrisisReport(context))}>
              <Clipboard className="mr-1.5 h-3.5 w-3.5" /> {copyState === 'report' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">{reportPreview}</pre>
        </section>

        <section className="border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Reusable agent system prompt</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Deadline-generated, task-specific instructions ready to paste into your preferred coding agent.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleCopy('prompt', prompt)}>
              <Clipboard className="mr-1.5 h-3.5 w-3.5" /> {copyState === 'prompt' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">{prompt}</pre>
        </section>
      </div>

      <section className="border border-border bg-card p-5 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Implementation notes for the record</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">{savedState === 'saved' ? 'Saved locally' : 'Saving…'}</span>
        </div>
        <p className="text-xs text-muted-foreground">Add your project-specific decisions or context; this note is included in the report and reusable prompt.</p>
        <textarea
          rows={7}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={'Example:\n- Built the prototype in Codex using React + Vite.\n- Implemented the core flow in src/...\n- Verified with npm run build and a manual browser check.\n- Known issue: ...'}
          className="w-full resize-y border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </section>
    </div>
  );
};
