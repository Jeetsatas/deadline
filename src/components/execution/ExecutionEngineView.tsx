import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  Terminal,
  Layers,
  FolderGit2,
  Clock,
  ArrowRight,
  RefreshCw,
  Check,
} from 'lucide-react';

export const ExecutionEngineView: React.FC = () => {
  const {
    deadlines,
    selectDeadline,
    openCreateModal,
    bridgeStatus,
    detectedIDEs,
    activeExecutionSessions,
    environmentReports,
    projectConfigurations,
    fetchHostRuntimes,
    detectInstalledIDEs,
  } = useDeadlineStore();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'environments' | 'ide-sessions' | 'history'>('pipeline');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deadlines with approved plans
  const plannedDeadlines = deadlines.filter((d) => Boolean(d.approvedPlan));

  const activeSessionsList = Object.values(activeExecutionSessions);
  const totalVerifiedEnvs = Object.values(environmentReports).filter((r) => r.isReady).length;

  const handleRefreshDiscovery = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([detectInstalledIDEs(), fetchHostRuntimes()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Execution Engine
            </h1>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                bridgeStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bridgeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              Bridge {bridgeStatus === 'connected' ? 'Online :4488' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manages the transition from AI planning to local environment initialization and Universal IDE execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshDiscovery}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Runtimes
          </Button>
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Plan New Deliverable
          </Button>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Approved AI Plans
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {plannedDeadlines.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Synthesized via AI models</span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Verified Environments
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {totalVerifiedEnvs}
          </div>
          <span className="text-[10px] text-muted-foreground">Scaffolded & verified on disk</span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Opened IDE Workspaces
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-primary">
            {activeSessionsList.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Deadline cannot track editor agent processes</span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Supported IDE Providers
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {Object.keys(detectedIDEs).length || 6}
          </div>
          <span className="text-[10px] text-muted-foreground">Universal IDE integration</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
        {[
          { id: 'pipeline' as const, label: 'Execution Pipeline', count: plannedDeadlines.length, icon: Cpu },
          { id: 'environments' as const, label: 'Verified Environments', count: Object.keys(projectConfigurations).length, icon: FolderGit2 },
          { id: 'ide-sessions' as const, label: 'IDE Sessions', count: activeSessionsList.length, icon: Terminal },
          { id: 'history' as const, label: 'Plan Version History', count: plannedDeadlines.filter(d => (d.planHistory?.length || 0) > 0).length, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-secondary text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-secondary text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Execution Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {plannedDeadlines.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
              <Cpu className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No active AI execution plans yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Generate an execution plan using Google Gemini or Anthropic inside any project workspace to unlock guided milestones, environment initialization, and one-click IDE handoff.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Create Project with AI Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {plannedDeadlines.map((d) => {
                const plan = d.approvedPlan!;
                const envReport = environmentReports[d.id];
                const projectConfig = projectConfigurations[d.id];
                const activeSession = activeExecutionSessions[d.id];

                return (
                  <div
                    key={d.id}
                    className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge priority={d.priority}>{d.priority}</Badge>
                        <h3 className="text-base font-bold text-foreground truncate">
                          {d.title}
                        </h3>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-bold border border-purple-500/20">
                          {plan.providerId.toUpperCase()} • {plan.modelId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectDeadline(d.id)}
                        >
                          Open Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Plan Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-secondary/40 p-3.5 rounded-xl border border-border/60">
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">
                          Task Understanding:
                        </span>
                        <p className="text-muted-foreground line-clamp-2">
                          {plan.taskUnderstanding}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block mb-0.5">
                          Suggested Approach:
                        </span>
                        <p className="text-muted-foreground line-clamp-2">
                          {plan.suggestedApproach}
                        </p>
                      </div>
                    </div>

                    {/* Status Pills & Progress */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Environment status */}
                        {envReport?.isReady ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Environment Ready ({projectConfig?.projectType || 'Verified'})
                          </span>
                        ) : projectConfig ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            Configured ({projectConfig.projectType})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground font-semibold">
                            Environment Setup Pending
                          </span>
                        )}

                        {/* IDE Session status */}
                        {activeSession ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold border border-primary/20">
                            <Terminal className="h-3.5 w-3.5" />
                            Session Active ({activeSession.providerId})
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            IDE: Universal Handoff Ready
                          </span>
                        )}
                      </div>

                      {/* Milestones count */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {d.milestones.filter((m) => m.isCompleted).length} / {d.milestones.length} Milestones
                        </span>
                        <div className="w-24">
                          <ProgressBar progress={d.progress} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verified Environments */}
      {activeTab === 'environments' && (
        <div className="space-y-4">
          {Object.keys(projectConfigurations).length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
              <FolderGit2 className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No project environments configured yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Use the "Execute & Connect IDE" wizard in any workspace to initialize and verify a project directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(projectConfigurations).map(([deadlineId, config]) => {
                const report = environmentReports[deadlineId];
                const deadline = deadlines.find((d) => d.id === deadlineId);

                return (
                  <div
                    key={deadlineId}
                    className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">
                          {config.projectName}
                        </h4>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          For: {deadline?.title || deadlineId}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          report?.isReady
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}
                      >
                        {report?.isReady ? 'VERIFIED' : 'PARTIALLY VERIFIED'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/60 text-xs font-mono text-muted-foreground break-all">
                      {config.projectPath}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-background border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">Language</span>
                        <span className="font-semibold text-foreground capitalize">
                          {config.language}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-background border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">Package Mgr</span>
                        <span className="font-semibold text-foreground capitalize">
                          {config.packageManager}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-background border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">Git Repo</span>
                        <span className="font-semibold text-foreground">
                          {config.initGit ? 'Initialized' : 'Existing'}
                        </span>
                      </div>
                    </div>

                    {report && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Verified {formatDate(report.verifiedAt)}</span>
                        {report.issues.length > 0 ? (
                          <span className="text-amber-500 font-medium">
                            {report.issues.length} warnings
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> All checks passed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Active IDE Sessions */}
      {activeTab === 'ide-sessions' && (
        <div className="space-y-4">
          {activeSessionsList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
              <Terminal className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No active IDE sessions running
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Launch Claude Code, Codex, Cursor, Antigravity, VS Code, or Windsurf from any deadline workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeSessionsList.map((session) => {
                const deadline = deadlines.find((d) => d.id === session.deadlineId);

                return (
                  <div
                    key={session.sessionId}
                    className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {session.providerId.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                          {session.status.toUpperCase()}
                        </span>
                        {session.processId && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            PID: {session.processId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Project: {deadline?.title || session.deadlineId} • Path: {session.projectPath}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectDeadline(session.deadlineId)}
                      >
                        Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Plan Version History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {plannedDeadlines.map((d) => {
            const history = d.planHistory || [];
            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">
                    {d.title}
                  </h4>
                  <span className="text-xs font-mono text-muted-foreground">
                    Current Version: v{d.approvedPlan?.version || 1} • {history.length} archive entries
                  </span>
                </div>

                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Initial version approved on {formatDate(d.approvedPlan?.approvedAt || d.createdAt)}. No previous iterations archived.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {history.map((h, i) => (
                      <div
                        key={h.id || i}
                        className="p-3 rounded-lg bg-secondary/40 border border-border/50 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-foreground">v{h.version} ({h.providerId})</span>
                          <p className="text-muted-foreground text-[11px] truncate max-w-md">
                            {h.taskUnderstanding}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(h.approvedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
