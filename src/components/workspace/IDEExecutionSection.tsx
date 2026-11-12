import React, { useState, useEffect } from 'react';
import { Deadline } from '@/types';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { ideProviderRegistry } from '@/core/ide/IDEProviderRegistry';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Code2,
  Folder,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Cpu,
  GitBranch,
  ArrowRight,
  Check,
  Key,
} from 'lucide-react';

interface IDEExecutionSectionProps {
  deadline: Deadline;
  onOpenSubmitModal?: () => void;
}

export const IDEExecutionSection: React.FC<IDEExecutionSectionProps> = ({
  deadline,
  onOpenSubmitModal,
}) => {
  const {
    bridgeStatus,
    bridgePort,
    pairingToken,
    detectedIDEs,
    isDetectingIDEs,
    selectedIDEProviderId,
    selectedProjectPath,
    activeExecutionSessions,
    isStartingIDESession,
    ideSessionError,
    workspaceChanges,
    isInspectingWorkspaceChanges,
    pairBridge,
    detectInstalledIDEs,
    setSelectedIDEProvider,
    setSelectedProjectPath,
    startIDESession,
    refreshIDESessionStatus,
    stopIDESession,
    inspectWorkspaceChanges,
  } = useDeadlineStore();

  const [projectPathInput, setProjectPathInput] = useState(selectedProjectPath);
  const [pathValidationStatus, setPathValidationStatus] = useState<{
    valid?: boolean;
    isGitRepo?: boolean;
    error?: string;
  } | null>(null);
  const [isValidatingPath, setIsValidatingPath] = useState(false);
  const [userInstructions, setUserInstructions] = useState('');
  const [customTokenInput, setCustomTokenInput] = useState(pairingToken || '');
  const [showPairModal, setShowPairModal] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const activeSession = activeExecutionSessions[deadline.id];
  const changes = workspaceChanges[deadline.id];
  const allProviders = ideProviderRegistry.listProviders();
  const selectedProvider = ideProviderRegistry.getProvider(selectedIDEProviderId);
  const selectedDetection = detectedIDEs[selectedIDEProviderId];

  // Refresh status every 10 seconds if a session is actively running
  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed' || activeSession.status === 'cancelled') {
      return;
    }
    const interval = setInterval(() => {
      refreshIDESessionStatus(deadline.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeSession, deadline.id, refreshIDESessionStatus]);

  // Handle validating project path
  const handleValidatePath = async () => {
    setIsValidatingPath(true);
    setPathValidationStatus(null);
    try {
      const trimmed = projectPathInput.replace(/[\r\n]+/g, '');
      const res = await fetch(`http://127.0.0.1:${bridgePort}/workspace/validate-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pairingToken || ''}`,
        },
        body: JSON.stringify({ projectPath: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPathValidationStatus({ valid: true, isGitRepo: data.isGitRepo });
        setSelectedProjectPath(data.resolvedPath || trimmed);
      } else {
        setPathValidationStatus({ valid: false, error: data.error || 'Invalid path' });
      }
    } catch (e) {
      setPathValidationStatus({
        valid: false,
        error: (e as Error).message || 'Failed to reach local bridge',
      });
    } finally {
      setIsValidatingPath(false);
    }
  };

  // Handle manual pairing
  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPairing(true);
    setPairError(null);
    try {
      const ok = await pairBridge(customTokenInput.trim(), bridgePort);
      if (ok) {
        setShowPairModal(false);
      } else {
        setPairError('Pairing failed. Please verify that the token matches ~/.deadline/bridge-auth.json');
      }
    } catch (err) {
      setPairError((err as Error).message || 'Pairing error');
    } finally {
      setIsPairing(false);
    }
  };

  // Launch session
  const handleLaunch = async () => {
    try {
      await startIDESession(deadline.id, userInstructions.trim() || undefined);
    } catch {
      // error is captured in ideSessionError state
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* 1. Bridge Status & Security Banner */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              bridgeStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : bridgeStatus === 'connecting'
                ? 'bg-amber-500 animate-spin'
                : 'bg-red-500'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Deadline Local Execution Bridge
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  bridgeStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                }`}
              >
                {bridgeStatus === 'connected'
                  ? 'ONLINE (127.0.0.1:4488)'
                  : bridgeStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Secure loopback daemon executing agent handoffs and tool environments with cryptographic authentication.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bridgeStatus !== 'connected' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPairModal(true)}
              className="text-xs cursor-pointer"
            >
              <Key className="h-3.5 w-3.5 mr-1 text-primary" />
              Pair Bridge
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => detectInstalledIDEs()}
              isLoading={isDetectingIDEs}
              className="text-xs cursor-pointer text-muted-foreground hover:text-foreground"
              title="Rescan installed IDEs and coding agents"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Rescan IDEs
            </Button>
          )}
        </div>
      </div>

      {/* 2. Provider Selection Grid — All 6 Providers Treated Equally */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Select Development Environment or Coding Agent
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose the IDE or autonomous CLI agent you want to execute this deadline with. All environments are first-class integrations.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {Object.values(detectedIDEs).filter((d) => d.isInstalled).length} of {allProviders.length} detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allProviders.map((provider) => {
            const isSelected = selectedIDEProviderId === provider.id;
            const detection = detectedIDEs[provider.id];
            const isInstalled = Boolean(detection?.isInstalled);

            return (
              <div
                key={provider.id}
                onClick={() => setSelectedIDEProvider(provider.id)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                    : 'border-border bg-card hover:border-border/80 hover:bg-secondary/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {provider.metadata.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isInstalled
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {isInstalled ? 'Detected' : 'Not Found'}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    {provider.metadata.badgeLabel}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {provider.metadata.description}
                </p>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="truncate max-w-[150px]">
                    {isInstalled ? detection?.version || 'Ready' : 'Requires install'}
                  </span>
                  <a
                    href={provider.metadata.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Docs <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Project Directory & Context Configuration */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Folder className="h-4 w-4 text-primary" />
          Project Workspace Directory & Execution Context
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center justify-between">
            <span>Local Repository / Project Folder Path:</span>
            {pathValidationStatus?.valid && (
              <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Valid Directory{' '}
                {pathValidationStatus.isGitRepo && '(Git Repository Detected)'}
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectPathInput}
              onChange={(e) => {
                setProjectPathInput(e.target.value);
                setPathValidationStatus(null);
              }}
              placeholder="/Users/username/projects/my-app"
              className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleValidatePath}
              isLoading={isValidatingPath}
              className="text-xs cursor-pointer shrink-0"
            >
              Validate Path
            </Button>
          </div>
          {pathValidationStatus?.error && (
            <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {pathValidationStatus.error}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            A canonical handoff file (<span className="font-mono text-foreground font-semibold">DEADLINE_CONTEXT.md</span>) will be safely generated inside this directory with task requirements, milestones, and deliverable targets.
          </p>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <label className="text-xs font-medium text-foreground">
            Custom Instructions or Focus Area for Agent (Optional):
          </label>
          <textarea
            rows={2}
            value={userInstructions}
            onChange={(e) => setUserInstructions(e.target.value)}
            placeholder="e.g. Focus on Milestone 1 first. Write full unit tests using Vitest before finishing."
            className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
          />
        </div>

        {/* Selected Provider Execution Summary Card */}
        {selectedProvider && (
          <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Target: {selectedProvider.metadata.displayName}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    selectedDetection?.isInstalled
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  }`}
                >
                  {selectedDetection?.isInstalled ? 'Ready to Execute' : 'Setup Required'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {selectedDetection?.isInstalled
                  ? `Launch command: ${selectedProvider.metadata.defaultBinaryNames[0]} in ${projectPathInput}`
                  : `Please install ${selectedProvider.metadata.displayName} to launch directly from Deadline.`}
              </p>
            </div>

            <div>
              {selectedDetection?.isInstalled ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleLaunch}
                  isLoading={isStartingIDESession}
                  disabled={isStartingIDESession || bridgeStatus !== 'connected'}
                  className="cursor-pointer shadow-sm font-semibold"
                >
                  <Play className="h-4 w-4 mr-1.5 fill-current" />
                  {selectedProvider.metadata.primaryActionLabel}
                </Button>
              ) : (
                <a
                  href={selectedProvider.metadata.installGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Installation Guide
                </a>
              )}
            </div>
          </div>
        )}

        {ideSessionError && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{ideSessionError}</span>
          </div>
        )}
      </div>

      {/* 4. Active Session Runtime Card (if session started) */}
      {activeSession && (
        <div className="p-5 rounded-xl border border-primary/40 bg-card shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary animate-pulse" />
              <h4 className="text-sm font-bold text-foreground">
                Active Execution Session
              </h4>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  activeSession.status === 'running'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 animate-pulse'
                    : activeSession.status === 'externally_managed'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                    : activeSession.status === 'awaiting_verification'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {activeSession.status.toUpperCase().replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => refreshIDESessionStatus(deadline.id)}
                className="text-xs cursor-pointer"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
              {activeSession.status === 'running' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => stopIDESession(deadline.id)}
                  className="text-xs cursor-pointer text-red-500 hover:bg-red-500/10 border-red-500/30"
                >
                  <Square className="h-3 w-3 mr-1" /> Stop Session
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[10px] text-muted-foreground block font-mono">PROVIDER & PID</span>
              <span className="font-semibold text-foreground font-mono">
                {activeSession.providerId} {activeSession.processId ? `(PID: ${activeSession.processId})` : ''}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[10px] text-muted-foreground block font-mono">STARTED AT</span>
              <span className="font-semibold text-foreground font-mono">
                {new Date(activeSession.startedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[10px] text-muted-foreground block font-mono">WORKSPACE DIRECTORY</span>
              <span className="font-semibold text-foreground font-mono truncate block" title={activeSession.projectPath}>
                {activeSession.projectPath}
              </span>
            </div>
          </div>

          {/* Session Event Log */}
          {activeSession.executionEvents && activeSession.executionEvents.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Session Audit History:
              </span>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                {activeSession.executionEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-[10px] text-primary shrink-0">
                      [{new Date(evt.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-foreground">{evt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Workspace Verification & Changed Files Inspector */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Workspace Changes & Deliverable Verification
            </h4>
            <p className="text-xs text-muted-foreground">
              Inspect files changed by the AI coding agent or IDE before submitting final work.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inspectWorkspaceChanges(deadline.id)}
            isLoading={isInspectingWorkspaceChanges}
            className="text-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Inspect Workspace Changes
          </Button>
        </div>

        {changes ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                {changes.totalChanges} File(s) Changed
              </Badge>
              {changes.isGitRepo && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  (Git tracked repository)
                </span>
              )}
            </div>

            {changes.totalChanges > 0 ? (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {changes.modifiedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-blue-500">
                    <span className="text-[10px] font-bold px-1 rounded bg-blue-500/10">MOD</span>
                    <span className="text-foreground truncate">{f}</span>
                  </div>
                ))}
                {changes.untrackedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-emerald-500">
                    <span className="text-[10px] font-bold px-1 rounded bg-emerald-500/10">NEW</span>
                    <span className="text-foreground truncate">{f}</span>
                  </div>
                ))}
                {changes.deletedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-red-500">
                    <span className="text-[10px] font-bold px-1 rounded bg-red-500/10">DEL</span>
                    <span className="text-foreground truncate">{f}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No changed files detected in workspace since last check.
              </p>
            )}

            {/* Ready to Submit Callout */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Ready to Complete Deliverable?
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Target expected output: <span className="font-semibold text-foreground">"{deadline.expectedOutput}"</span>
                </p>
              </div>
              {onOpenSubmitModal && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onOpenSubmitModal}
                  className="cursor-pointer font-semibold shadow-sm text-xs"
                >
                  Submit Final Deliverable
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs space-y-2">
            <FileCode className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p>Click "Inspect Workspace Changes" to verify files generated by your IDE agent.</p>
          </div>
        )}
      </div>

      {/* PAIRING MODAL */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  Pair with Deadline Local Bridge
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter the 256-bit cryptographic pairing secret generated by your local bridge daemon (saved at <span className="font-mono text-foreground font-semibold">~/.deadline/bridge-auth.json</span>).
            </p>

            <form onSubmit={handlePair} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Pairing Secret Token:
                </label>
                <input
                  type="password"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="00e901de26fe44ca78..."
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono"
                />
              </div>

              {pairError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                  {pairError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPairModal(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPairing}
                  className="cursor-pointer"
                >
                  Authenticate & Pair
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
