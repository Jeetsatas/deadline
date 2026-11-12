import React, { useState, useEffect } from 'react';
import { Deadline } from '@/types';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { executionEngine } from '@/core/execution';
import { SubmitDeliverableModal } from '@/components/deliverables/SubmitDeliverableModal';
import { AIExecutionPlanSection } from './AIExecutionPlanSection';
import { formatDate, formatDateTime, generateDeadlineMarkdownReport } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
  FileText,
  AlertCircle,
  Layers,
  Sparkles,
  Edit2,
  Check,
  Save,
  RotateCcw,
  ShieldCheck,
  Globe,
  Github,
  UploadCloud,
  FileCode,
  Download,
  ChevronUp,
  ChevronDown,
  Cpu,
  Compass,
} from 'lucide-react';

interface DeadlineWorkspaceProps {
  deadline: Deadline;
  onBack: () => void;
}

export const DeadlineWorkspace: React.FC<DeadlineWorkspaceProps> = ({ deadline, onBack }) => {
  const {
    toggleMilestone,
    addMilestone,
    deleteMilestone,
    reorderMilestone,
    updateProgress,
    updateNotes,
    addReferenceLink,
    removeReferenceLink,
    reopenDeadline,
    openCreateModal,
    deleteDeadline,
  } = useDeadlineStore();

  const [notes, setNotes] = useState(deadline.notes || '');
  const [isNotesSaved, setIsNotesSaved] = useState(true);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Link adding state
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<'execution' | 'ai_plan'>('execution');

  // Execution engine analysis
  const executionPlan = executionEngine.analyzeDeadline(deadline);

  // Auto-save notes with 600ms debounce
  useEffect(() => {
    setNotes(deadline.notes || '');
  }, [deadline.id]);

  useEffect(() => {
    if (notes === (deadline.notes || '')) return;
    setIsNotesSaved(false);
    const timer = setTimeout(() => {
      updateNotes(deadline.id, notes);
      setIsNotesSaved(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [notes, deadline.id, deadline.notes, updateNotes]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    await addMilestone(deadline.id, newMilestoneTitle.trim(), newMilestoneDate || undefined);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setShowAddMilestone(false);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const finalUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    await addReferenceLink(deadline.id, {
      title: linkTitle.trim() || linkUrl.trim(),
      url: finalUrl,
    });
    setLinkTitle('');
    setLinkUrl('');
    setShowAddLink(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${deadline.title}"?`)) {
      deleteDeadline(deadline.id);
      onBack();
    }
  };

  const handleExportReport = () => {
    const reportMd = generateDeadlineMarkdownReport(deadline);
    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deadline.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-execution-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedMilestones = deadline.milestones.filter((m) => m.isCompleted).length;
  const isCompleted = deadline.status === 'completed';
  const approach = deadline.executionApproach || 'prototype_first';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to List
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge priority={deadline.priority}>{deadline.priority}</Badge>
            <Badge status={deadline.status}>{deadline.status.replace('_', ' ')}</Badge>

            {/* Execution Approach Badge */}
            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border border-border bg-secondary text-foreground">
              {approach === 'prototype_first' ? (
                <>
                  <Cpu className="h-3 w-3 text-orange-500" />
                  <span>Prototype First</span>
                </>
              ) : approach === 'guided_execution' ? (
                <>
                  <Compass className="h-3 w-3 text-emerald-500" />
                  <span>Guided Execution</span>
                </>
              ) : (
                <>
                  <Target className="h-3 w-3 text-blue-500" />
                  <span>Output Only</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportReport} title="Export markdown report">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Report (.md)
          </Button>

          <Button variant="outline" size="sm" onClick={() => openCreateModal(deadline)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Details
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>

          {!isCompleted ? (
            <Button variant="primary" size="sm" onClick={() => setIsSubmitModalOpen(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit Deliverable
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => reopenDeadline(deadline.id)}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reopen Execution
            </Button>
          )}
        </div>
      </div>

      {/* Hero Workspace Header: Title, Countdown Timer, Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>PROJECT WORKSPACE</span>
            <span>•</span>
            <span>DUE {formatDate(deadline.deadlineDate)} AT {deadline.deadlineTime}</span>
            <span>•</span>
            <span className="capitalize">{deadline.deliverableType.replace('_', ' ')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {deadline.title}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {deadline.description || 'No additional project description provided.'}
          </p>

          {/* Tags */}
          {deadline.tags && deadline.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {deadline.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-secondary text-muted-foreground border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Live Countdown & Delivery Status Card */}
        <div className="lg:col-span-1">
          <CountdownTimer
            dueDateTime={deadline.dueDateTime}
            isCompleted={isCompleted}
            size="lg"
            className="w-full h-full shadow-sm"
          />
        </div>
      </div>

      {/* Workspace Sub-Navigation Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setWorkspaceTab('execution')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            workspaceTab === 'execution'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Workspace Execution</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkspaceTab('ai_plan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            workspaceTab === 'ai_plan'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Execution Plan</span>
          {deadline.approvedPlan ? (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-background/20 font-bold ml-1">
              v{deadline.approvedPlan.version}
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold ml-1">
              AI Available
            </span>
          )}
        </button>
      </div>

      {workspaceTab === 'ai_plan' ? (
        <AIExecutionPlanSection deadline={deadline} />
      ) : (
        <>
      {/* Active AI Plan Compact Callout if available */}
      {deadline.approvedPlan && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-foreground block truncate">
                AI Execution Plan v{deadline.approvedPlan.version} Active ({deadline.approvedPlan.providerId})
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {deadline.approvedPlan.taskUnderstanding}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWorkspaceTab('ai_plan')}
            className="shrink-0 text-xs cursor-pointer"
          >
            View Full Plan
          </Button>
        </div>
      )}

      {/* EXECUTION APPROACH CALLOUT: PROTOTYPE FIRST VS GUIDED VS OUTPUT ONLY */}
      {approach === 'prototype_first' && !isCompleted && (
        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex items-start gap-3 text-xs">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground text-sm">
                Prototype First Execution Active
              </h4>
              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" size="sm">
                Proving Output
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Objective: Build the minimum working prototype before adding bells and whistles. Proving core operations first prevents last-minute zero-output panic.
            </p>
            {deadline.selectedPrototypeId && (
              <p className="text-[11px] font-mono text-primary mt-1">
                Connected Prototype Blueprint: {deadline.selectedPrototypeId}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottlenecks Warning Banner (If Any) */}
      {executionPlan.bottlenecks.length > 0 && !isCompleted && (
        <div className="space-y-2">
          {executionPlan.bottlenecks.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs ${
                b.severity === 'critical'
                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">{b.message}</span>
                <span className="text-foreground/80 font-normal">{b.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CORE PHILOSOPHY HIGHLIGHT: Target Deliverable (VISUAL FOCAL POINT) & Minimum Acceptable Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Required Expected Output (Visual Focal Point) */}
        <div className="p-5 rounded-xl border-2 border-primary/40 bg-gradient-to-br from-orange-500/10 via-card to-card shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Target className="h-4 w-4" />
              <span>Target Output (The Deliverable)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary text-white font-bold">
              PRIMARY GOAL
            </span>
          </div>

          <p className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {deadline.expectedOutput}
          </p>

          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
            "The output matters more than the activity." Keep execution focused on producing this specific deliverable.
          </p>
        </div>

        {/* Minimum Acceptable Output (MVP Fallback) */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Minimum Acceptable Output (MVP Fallback)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                FALLBACK
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {deadline.minimumAcceptableOutput ||
                'Not defined yet. In high-pressure moments, define the bare minimum deliverable required to avoid total failure.'}
            </p>
          </div>

          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
            If time runs out, deliver this MVP rather than failing to submit anything.
          </p>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Milestones, Execution Engine, Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution Progress Bar & Adjuster */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Execution Progress</h3>
                <p className="text-xs text-muted-foreground">
                  Computed from {completedMilestones}/{deadline.milestones.length} completed milestones or manually adjusted.
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-primary">{deadline.progress}%</span>
            </div>

            <ProgressBar progress={deadline.progress} size="lg" isCompleted={isCompleted} />

            {/* Quick Adjustment Presets */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5">
                {[0, 25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => updateProgress(deadline.id, val)}
                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                      deadline.progress === val
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              <span className="text-xs text-muted-foreground">
                {isCompleted ? '✓ Completed' : deadline.progress >= 75 ? 'Final Polish' : deadline.progress >= 25 ? 'In Execution' : 'Starting Out'}
              </span>
            </div>
          </div>

          {/* Milestones Checklist with Reordering */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">Milestones</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  ({completedMilestones}/{deadline.milestones.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddMilestone(!showAddMilestone)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
              </Button>
            </div>

            {/* Add Milestone Form */}
            {showAddMilestone && (
              <form onSubmit={handleCreateMilestone} className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Milestone title (e.g. Deploy calculator to Vercel)"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    autoFocus
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMilestone(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Milestone
                  </Button>
                </div>
              </form>
            )}

            {/* Milestones List */}
            {deadline.milestones.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                <p>No execution milestones defined yet.</p>
                <p className="mt-1">Breaking large deliverables into 3-4 key milestones increases on-time delivery by 40%.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddMilestone(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add First Milestone
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {deadline.milestones
                  .sort((a, b) => a.order - b.order)
                  .map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => toggleMilestone(deadline.id, m.id)}
                      className={`group flex items-start justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        m.isCompleted
                          ? 'bg-secondary/40 border-border/60 text-muted-foreground line-through opacity-80'
                          : 'bg-card border-border hover:border-zinc-400 dark:hover:border-zinc-700 text-foreground'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 pr-2">
                        <button
                          type="button"
                          className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                        >
                          {m.isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium tracking-tight ${m.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {m.title}
                          </p>
                          {m.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {m.description}
                            </p>
                          )}
                          {m.targetDate && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Target: {formatDate(m.targetDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Milestone Actions: Reorder up/down and Delete */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderMilestone(deadline.id, m.id, 'up');
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="Move milestone up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === deadline.milestones.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderMilestone(deadline.id, m.id, 'down');
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                          title="Move milestone down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMilestone(deadline.id, m.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-red-500"
                          title="Delete milestone"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Execution Scratchpad / Notes */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">Execution Notes & Architecture</h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                {isNotesSaved ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Check className="h-3 w-3" /> Saved locally
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Save className="h-3 w-3 animate-pulse" /> Saving...
                  </span>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record technical specs, run instructions, key test findings, or thoughts for this deliverable..."
              className="w-full rounded-lg border border-input bg-background/50 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Final Submission, Reference Links, Attachments */}
        <div className="lg:col-span-1 space-y-6">
          {/* FINAL SUBMISSION PANEL (Separated clearly!) */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold tracking-tight">Final Deliverable Submission</h3>
              </div>
              {deadline.finalDeliverable ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Submitted
                </Badge>
              ) : (
                <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                  Pending Output
                </Badge>
              )}
            </div>

            {deadline.finalDeliverable ? (
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-semibold">
                    Submitted Deliverable
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {deadline.finalDeliverable.title}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-background border border-border text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {deadline.finalDeliverable.submissionFormat === 'repository' ? (
                      <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : deadline.finalDeliverable.submissionFormat === 'url' ? (
                      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <a
                      href={deadline.finalDeliverable.resourceUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-mono truncate"
                    >
                      {deadline.finalDeliverable.resourceUri}
                    </a>
                  </div>
                  <a
                    href={deadline.finalDeliverable.resourceUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {deadline.finalDeliverable.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {deadline.finalDeliverable.summary}
                  </p>
                )}

                <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
                  Submitted on {formatDateTime(deadline.finalDeliverable.submittedAt)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="w-full text-xs"
                >
                  Update Submission Details
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center space-y-2">
                <Target className="h-8 w-8 text-primary mx-auto opacity-80" />
                <h4 className="text-xs font-semibold text-foreground">Where will you submit this deliverable?</h4>
                <p className="text-[11px] text-muted-foreground">
                  Record the final repository, production URL, document link, or file archive to conclude this project.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Submit Final Deliverable
                </Button>
              </div>
            )}
          </div>

          {/* REFERENCE LINKS */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">Reference Links</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLink(!showAddLink)}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Link
              </Button>
            </div>

            {showAddLink && (
              <form onSubmit={handleCreateLink} className="p-3 rounded-lg bg-secondary/60 border border-border space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Link Title (e.g. API Specs)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddLink(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Link
                  </Button>
                </div>
              </form>
            )}

            {deadline.referenceLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No reference links added yet.</p>
            ) : (
              <div className="space-y-2">
                {deadline.referenceLinks.map((link) => (
                  <div
                    key={link.id}
                    className="group flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/80 text-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 min-w-0 pr-2 truncate text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground truncate">{link.title}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => removeReferenceLink(deadline.id, link.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ATTACHMENTS & METADATA */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">Attachments & Specs</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {deadline.attachments?.length || 0}
              </span>
            </div>

            {(!deadline.attachments || deadline.attachments.length === 0) ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No attachments uploaded. Use external links or submit repositories.
              </p>
            ) : (
              <div className="space-y-2">
                {deadline.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium truncate">{att.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {Math.round(att.sizeBytes / 1024)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Deliverable Submission Modal */}
      {isSubmitModalOpen && (
        <SubmitDeliverableModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          deadline={deadline}
        />
      )}
    </div>
  );
};
