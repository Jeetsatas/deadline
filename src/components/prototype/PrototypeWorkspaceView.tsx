import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { prototypeRegistry } from '@/core/prototype';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import {
  Box,
  Target,
  Layers,
  ArrowRight,
  CheckCircle2,
  Plus,
  Sliders,
  Zap,
} from 'lucide-react';

export const PrototypeWorkspaceView: React.FC = () => {
  const { deadlines, selectDeadline, openCreateModal } = useDeadlineStore();

  const [activeTab, setActiveTab] = useState<'prototypes' | 'blueprints' | 'completed'>('prototypes');

  // Filter prototype-focused deadlines
  const prototypeDeadlines = deadlines.filter(
    (d) => d.executionApproach === 'prototype_first' || d.deliverableType === 'prototype'
  );

  const activePrototypes = prototypeDeadlines.filter((d) => d.status !== 'completed');
  const completedPrototypes = prototypeDeadlines.filter((d) => d.status === 'completed');

  // Blueprints from registry
  const blueprints = prototypeRegistry.listTypes({ enabledOnly: true });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Prototype Workspace
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
              {activePrototypes.length} in development
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dedicated environment focused on creating the first working version (Minimum Acceptable Output) before final polish.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4 mr-1.5" /> Start New Prototype
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Active Prototypes
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-primary">
            {activePrototypes.length}
          </div>
          <span className="text-[10px] text-muted-foreground">In rapid iteration</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Delivered Prototypes
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {completedPrototypes.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Ready for production</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Available Blueprints
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {blueprints.length}
          </div>
          <span className="text-[10px] text-muted-foreground">In Prototype Registry</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Approach Ratio
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {deadlines.length > 0 ? Math.round((prototypeDeadlines.length / deadlines.length) * 100) : 0}%
          </div>
          <span className="text-[10px] text-muted-foreground">Of all projects use Prototype First</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
        {[
          { id: 'prototypes' as const, label: 'In-Flight Prototypes', count: activePrototypes.length, icon: Box },
          { id: 'blueprints' as const, label: 'Blueprint Library', count: blueprints.length, icon: Layers },
          { id: 'completed' as const, label: 'Completed Prototypes', count: completedPrototypes.length, icon: CheckCircle2 },
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
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-secondary text-muted-foreground">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: In-Flight Prototypes */}
      {activeTab === 'prototypes' && (
        <div className="space-y-4">
          {activePrototypes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
              <Box className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No active prototypes currently in flight
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Prototype-First execution helps you build the core functional mechanism quickly before tackling secondary features.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
                  <Plus className="h-4 w-4 mr-1.5" /> Start a Prototype-First Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activePrototypes.map((d) => {
                const blueprint = d.selectedPrototypeId
                  ? prototypeRegistry.getType(d.selectedPrototypeId)
                  : null;

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
                        {blueprint && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                            {blueprint.badge || 'Blueprint'} • {blueprint.name}
                          </span>
                        )}
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

                    {/* Dual Output Specification (MAO vs EO) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Minimum Acceptable Output */}
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                          <Zap className="h-3 w-3" /> Minimum Acceptable Output (MVP)
                        </span>
                        <p className="text-foreground font-medium">
                          {d.minimumAcceptableOutput || d.expectedOutput}
                        </p>
                      </div>

                      {/* Expected Full Output */}
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1 font-mono">
                          <Target className="h-3 w-3" /> Target Expected Output
                        </span>
                        <p className="text-foreground font-medium">
                          {d.expectedOutput}
                        </p>
                      </div>
                    </div>

                    {/* Prototype Configuration Params */}
                    {d.prototypeConfig && Object.keys(d.prototypeConfig).length > 0 && (
                      <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Sliders className="h-3.5 w-3.5 text-muted-foreground" /> Configured Parameters:
                        </span>
                        {Object.entries(d.prototypeConfig).map(([k, v]) => (
                          <span
                            key={k}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-background border border-border text-muted-foreground"
                          >
                            <span className="text-foreground font-semibold">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Milestone Progress & Due Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-muted-foreground">
                          Due {formatDate(d.deadlineDate)}
                        </span>
                        {d.referenceLinks.length > 0 && (
                          <span className="text-muted-foreground">
                            {d.referenceLinks.length} reference links
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {d.milestones.filter((m) => m.isCompleted).length} / {d.milestones.length} Milestones
                        </span>
                        <div className="w-28">
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

      {/* Tab 2: Blueprint Library */}
      {activeTab === 'blueprints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blueprints.map((bp) => (
            <div
              key={bp.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {bp.badge || 'Prototype'}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    v{bp.metadata?.version as string || '1.0.0'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">
                  {bp.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {bp.description}
                </p>

                {bp.supportedDeliverables && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {bp.supportedDeliverables.map((d) => (
                      <span
                        key={d}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground capitalize font-mono"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {bp.configSchema?.length || 0} configurable options
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCreateModal()}
                >
                  Use Blueprint <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Completed Prototypes */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedPrototypes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No prototypes marked as delivered yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once your working MVP is complete, submit it as a deliverable from the workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedPrototypes.map((d) => (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" /> Delivered & Verified
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDate(d.finalDeliverable?.submittedAt || d.updatedAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {d.title}
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    {d.finalDeliverable?.summary || d.expectedOutput}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono truncate max-w-xs">
                      {d.finalDeliverable?.resourceUri || 'Delivered output'}
                    </span>
                    <button
                      onClick={() => selectDeadline(d.id)}
                      className="text-primary hover:underline font-medium"
                    >
                      Workspace →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
