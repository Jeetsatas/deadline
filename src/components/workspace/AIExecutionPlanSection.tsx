import React, { useState, useMemo } from 'react';
import { Deadline, AIProviderId, ApprovedAIExecutionPlan, AIPlanMilestone } from '@/types';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  Target,
  Compass,
  Layers,
  Flame,
  Download,
  Edit2,
  RefreshCw,
  Save,
  X,
  History,
  Key,
  Check,
  AlertTriangle,
  Code2,
} from 'lucide-react';

interface AIExecutionPlanSectionProps {
  deadline: Deadline;
  onOpenIDE?: () => void;
}

export const AIExecutionPlanSection: React.FC<AIExecutionPlanSectionProps> = ({
  deadline,
  onOpenIDE,
}) => {
  const {
    discoveredModels,
    saveApprovedPlan,
    updateApprovedPlan,
    importPlanMilestones,
    regenerateDeadlinePlan,
    discoverProviderModels,
    isDiscoveringModels,
  } = useDeadlineStore();

  const plan = deadline.approvedPlan;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskUnderstanding, setEditTaskUnderstanding] = useState(plan?.taskUnderstanding || '');
  const [editSuggestedApproach, setEditSuggestedApproach] = useState(plan?.suggestedApproach || '');
  const [editFirstStep, setEditFirstStep] = useState(plan?.firstActionableStep || '');
  const [editResources, setEditResources] = useState(plan?.requiredResources?.join(', ') || '');
  const [editMilestones, setEditMilestones] = useState<AIPlanMilestone[]>(
    plan?.suggestedMilestones ? JSON.parse(JSON.stringify(plan.suggestedMilestones)) : []
  );

  // Milestone import modal/drawer state
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMilestoneIndices, setSelectedMilestoneIndices] = useState<number[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Regeneration state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenProviderId, setRegenProviderId] = useState<AIProviderId>(plan?.providerId || 'gemini');
  const [regenModelId, setRegenModelId] = useState<string>(plan?.modelId || 'gemini-2.0-flash');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Empty state generation
  const [isGeneratingInitial, setIsGeneratingInitial] = useState(false);
  const [initialProviderId, setInitialProviderId] = useState<AIProviderId>('gemini');
  const [initialModelId, setInitialModelId] = useState<string>('gemini-2.0-flash');
  const [initialError, setInitialError] = useState<string | null>(null);
  const [initialKeyInput, setInitialKeyInput] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  // History view state
  const [showHistory, setShowHistory] = useState(false);

  const existingMilestoneTitles = new Set(
    deadline.milestones.map((m) => m.title.trim().toLowerCase())
  );

  // Helper to check if model represents a non-text model (TTS, audio, embed, imagen)
  const isModelNonText = (id: string, name?: string) => {
    const cleanId = (id || '').toLowerCase();
    const cleanName = (name || '').toLowerCase();
    return (
      cleanId.includes('tts') ||
      cleanName.includes('tts') ||
      cleanId.includes('speech') ||
      cleanName.includes('speech') ||
      cleanId.includes('audio') ||
      cleanName.includes('audio') ||
      cleanId.includes('embed') ||
      cleanId.includes('imagen') ||
      cleanId === 'aqa' ||
      cleanId.startsWith('aqa-')
    );
  };

  // Filter discovered Gemini models strictly for compatible text generation models
  const compatibleGeminiModels = useMemo(() => {
    const list = discoveredModels['gemini'] || [];
    return list.filter((m) => !isModelNonText(m.id, m.displayName));
  }, [discoveredModels]);

  const selectedInitialMeta = useMemo(() => {
    return compatibleGeminiModels.find((m) => m.id === initialModelId);
  }, [compatibleGeminiModels, initialModelId]);

  const selectedRegenMeta = useMemo(() => {
    return compatibleGeminiModels.find((m) => m.id === regenModelId);
  }, [compatibleGeminiModels, regenModelId]);

  const isInitialModelIncompatible = useMemo(() => {
    if (initialProviderId !== 'gemini') return false;
    if (isModelNonText(initialModelId)) return true;
    if (compatibleGeminiModels.length > 0) {
      return !compatibleGeminiModels.some((m) => m.id === initialModelId);
    }
    return false;
  }, [initialProviderId, initialModelId, compatibleGeminiModels]);

  const isRegenModelIncompatible = useMemo(() => {
    if (regenProviderId !== 'gemini') return false;
    if (isModelNonText(regenModelId)) return true;
    if (compatibleGeminiModels.length > 0) {
      return !compatibleGeminiModels.some((m) => m.id === regenModelId);
    }
    return false;
  }, [regenProviderId, regenModelId, compatibleGeminiModels]);

  const handleRefreshModels = async (providerId: AIProviderId) => {
    let key = await credentialStorage.getSecret(`ai_key_${providerId}`);
    if (!key && initialKeyInput.trim()) {
      key = initialKeyInput.trim();
      await credentialStorage.saveSecret(`ai_key_${providerId}`, key);
    }
    if (key) {
      await discoverProviderModels(providerId, key);
    } else {
      setShowKeyPrompt(true);
    }
  };

  const handleStartEdit = () => {
    if (!plan) return;
    setEditTaskUnderstanding(plan.taskUnderstanding);
    setEditSuggestedApproach(plan.suggestedApproach);
    setEditFirstStep(plan.firstActionableStep);
    setEditResources(plan.requiredResources.join(', '));
    setEditMilestones(JSON.parse(JSON.stringify(plan.suggestedMilestones)));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!plan) return;
    const parsedResources = editResources
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    await updateApprovedPlan(deadline.id, {
      taskUnderstanding: editTaskUnderstanding.trim(),
      suggestedApproach: editSuggestedApproach.trim(),
      firstActionableStep: editFirstStep.trim(),
      requiredResources: parsedResources,
      suggestedMilestones: editMilestones,
    });

    setIsEditing(false);
  };

  const handleOpenImport = () => {
    if (!plan?.suggestedMilestones) return;
    // Default select all non-duplicate milestones
    const nonDuplicateIndices: number[] = [];
    plan.suggestedMilestones.forEach((m, idx) => {
      if (!existingMilestoneTitles.has(m.title.trim().toLowerCase())) {
        nonDuplicateIndices.push(idx);
      }
    });
    setSelectedMilestoneIndices(nonDuplicateIndices);
    setShowImportModal(true);
    setImportFeedback(null);
  };

  const handleExecuteImport = async () => {
    const result = await importPlanMilestones(deadline.id, selectedMilestoneIndices);
    if (result.importedCount > 0) {
      setImportFeedback(`Successfully imported ${result.importedCount} milestone(s) into deadline checklist.`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportFeedback(null);
      }, 1500);
    } else {
      setImportFeedback('No new milestones were imported (all selected are duplicates).');
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setRegenError(null);
    try {
      const hasKey = await credentialStorage.hasSecret(`ai_key_${regenProviderId}`);
      if (!hasKey) {
        throw new Error(
          `No active API key in session memory for ${regenProviderId}. Please configure it in Settings > AI Integrations.`
        );
      }

      const rawPlan = await regenerateDeadlinePlan(
        deadline.id,
        regenProviderId,
        regenModelId
      );

      // Create approved plan v+1
      const newVersion = (plan?.version || 1) + 1;
      const approvedPlanObj: ApprovedAIExecutionPlan = {
        id: `plan_${Date.now()}`,
        deadlineId: deadline.id,
        providerId: regenProviderId,
        modelId: regenModelId,
        generatedAt: rawPlan.generatedAt,
        approvedAt: new Date().toISOString(),
        version: newVersion,
        approvalStatus: 'approved',
        taskUnderstanding: rawPlan.taskUnderstanding,
        suggestedApproach: rawPlan.suggestedApproach,
        suggestedMilestones: rawPlan.suggestedMilestones.map((m) => ({
          title: m.title,
          description: m.description,
          order: m.order,
          isCriticalPath: m.isCriticalPath,
        })),
        requiredResources: rawPlan.requiredResources,
        firstActionableStep: rawPlan.firstActionableStep,
        deliverableSpecificGuidance: rawPlan.deliverableSpecificGuidance,
        latencyMs: rawPlan.latencyMs,
      };

      await saveApprovedPlan(deadline.id, approvedPlanObj);
      setShowRegenerateDialog(false);
    } catch (err: unknown) {
      setRegenError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateInitialPlan = async () => {
    setIsGeneratingInitial(true);
    setInitialError(null);
    try {
      let key = await credentialStorage.getSecret(`ai_key_${initialProviderId}`);
      if (!key && initialKeyInput.trim()) {
        key = initialKeyInput.trim();
        await credentialStorage.saveSecret(`ai_key_${initialProviderId}`, key);
      }

      if (!key) {
        setShowKeyPrompt(true);
        throw new Error(
          `No API key found in session memory for ${initialProviderId}. Please enter your key below.`
        );
      }

      const rawPlan = await regenerateDeadlinePlan(
        deadline.id,
        initialProviderId,
        initialModelId
      );

      const approvedPlanObj: ApprovedAIExecutionPlan = {
        id: `plan_${Date.now()}`,
        deadlineId: deadline.id,
        providerId: initialProviderId,
        modelId: initialModelId,
        generatedAt: rawPlan.generatedAt,
        approvedAt: new Date().toISOString(),
        version: 1,
        approvalStatus: 'approved',
        taskUnderstanding: rawPlan.taskUnderstanding,
        suggestedApproach: rawPlan.suggestedApproach,
        suggestedMilestones: rawPlan.suggestedMilestones.map((m) => ({
          title: m.title,
          description: m.description,
          order: m.order,
          isCriticalPath: m.isCriticalPath,
        })),
        requiredResources: rawPlan.requiredResources,
        firstActionableStep: rawPlan.firstActionableStep,
        deliverableSpecificGuidance: rawPlan.deliverableSpecificGuidance,
        latencyMs: rawPlan.latencyMs,
      };

      await saveApprovedPlan(deadline.id, approvedPlanObj);
    } catch (err: unknown) {
      setInitialError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingInitial(false);
    }
  };

  // EMPTY STATE: No approved plan exists yet
  if (!plan) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-border bg-card text-left space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Execution Intelligence</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              No Execution Plan Attached to this Deadline
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Deadline's AI Execution Copilot can synthesize a deliverable-tailored roadmap, tactical strategy,
              execution milestones, and first actionable step for "{deadline.title}".
            </p>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Select AI Provider
              </label>
              <select
                value={initialProviderId}
                onChange={(e) => {
                  const pId = e.target.value as AIProviderId;
                  setInitialProviderId(pId);
                  if (pId === 'gemini') {
                    const discovered = discoveredModels['gemini'];
                    setInitialModelId(discovered?.[0]?.id || 'gemini-2.0-flash');
                  } else {
                    setInitialModelId('claude-3-7-sonnet-latest');
                  }
                }}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer"
              >
                <option value="gemini">Google Gemini (Active)</option>
                <option value="anthropic">Anthropic Claude (Active)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Model
                </label>
                {initialProviderId === 'gemini' && (
                  <button
                    type="button"
                    onClick={() => handleRefreshModels('gemini')}
                    disabled={Boolean(isDiscoveringModels['gemini'])}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                  >
                    <RefreshCw className={`h-3 w-3 ${isDiscoveringModels['gemini'] ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                )}
              </div>
              {initialProviderId === 'gemini' ? (
                <select
                  value={initialModelId}
                  onChange={(e) => setInitialModelId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                >
                  {compatibleGeminiModels.length > 0 ? (
                    compatibleGeminiModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.id})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (gemini-2.0-flash)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (gemini-2.5-flash)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (gemini-1.5-flash)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (gemini-1.5-pro)</option>
                    </>
                  )}
                </select>
              ) : (
                <select
                  value={initialModelId}
                  onChange={(e) => setInitialModelId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                >
                  <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet (claude-3-7-sonnet-latest)</option>
                  <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (claude-3-5-haiku-latest)</option>
                  <option value="claude-3-opus-latest">Claude 3 Opus (claude-3-opus-latest)</option>
                </select>
              )}

              {/* Model capability metadata display */}
              {initialProviderId === 'gemini' && selectedInitialMeta && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                  <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">
                    ID: {selectedInitialMeta.id}
                  </span>
                  {selectedInitialMeta.inputTokenLimit && (
                    <span className="bg-background px-1.5 py-0.5 rounded border border-border">
                      Context: {selectedInitialMeta.inputTokenLimit >= 1000000 ? `${(selectedInitialMeta.inputTokenLimit / 1000000).toFixed(1)}M` : `${Math.round(selectedInitialMeta.inputTokenLimit / 1024)}K`}
                    </span>
                  )}
                  {selectedInitialMeta.outputTokenLimit && (
                    <span className="bg-background px-1.5 py-0.5 rounded border border-border">
                      Output: {Math.round(selectedInitialMeta.outputTokenLimit / 1024)}K
                    </span>
                  )}
                  <span className="bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded border border-primary/20">
                    Text Generation
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning for incompatible models */}
          {isInitialModelIncompatible && (
            <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 font-medium space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Incompatible Model Selected: "{initialModelId}"</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This model is not suitable for text execution plans (e.g. Text-to-Speech or audio-only model).
                Please select a compatible text generation model from the dropdown above.
              </p>
              {compatibleGeminiModels.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInitialModelId(compatibleGeminiModels[0].id)}
                  className="text-xs h-7 cursor-pointer"
                >
                  Switch to {compatibleGeminiModels[0].displayName}
                </Button>
              )}
            </div>
          )}

          {showKeyPrompt && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-primary" />
                <span>Enter {initialProviderId === 'gemini' ? 'Google Gemini' : 'Anthropic'} API Key:</span>
              </label>
              <input
                type="password"
                placeholder={initialProviderId === 'gemini' ? 'AIzaSy...' : 'sk-ant-...'}
                value={initialKeyInput}
                onChange={(e) => setInitialKeyInput(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Keys are stored only in volatile session memory and never saved to disk.
              </p>
            </div>
          )}

          {initialError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-500 font-medium">
              {initialError}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleGenerateInitialPlan}
            isLoading={isGeneratingInitial}
            disabled={isGeneratingInitial || isInitialModelIncompatible}
            className="cursor-pointer"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {isGeneratingInitial ? 'Generating Plan...' : 'Generate Execution Plan'}
          </Button>

          {isGeneratingInitial && (
            <p className="text-[11px] text-muted-foreground animate-pulse">
              Synthesizing structured roadmap using {initialModelId}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE PLAN VIEW
  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Plan Control Banner */}
      <div className="p-5 rounded-xl border border-primary/30 bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">
                <Sparkles className="h-3 w-3 mr-1" />
                Approved Execution Plan v{plan.version}
              </Badge>
              {plan.isEditedByUser && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                  User Edited
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Generated via <span className="font-semibold text-foreground uppercase">{plan.providerId}</span> using{' '}
              <span className="font-mono text-foreground font-semibold">{plan.modelId}</span>
              {plan.approvedAt && ` • Approved ${new Date(plan.approvedAt).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenIDE && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onOpenIDE}
                className="text-xs cursor-pointer shadow-sm font-semibold"
              >
                <Code2 className="h-3.5 w-3.5 mr-1" />
                Execute in IDE / Agent
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenImport}
              className="text-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-primary" />
              Import Milestones
            </Button>

            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="text-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Edits
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="text-xs cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Plan
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateDialog(true)}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Regenerate
            </Button>

            {deadline.planHistory && deadline.planHistory.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs cursor-pointer"
                title="View previous plan versions"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Previous Version Drawer / Alert */}
        {showHistory && deadline.planHistory && deadline.planHistory.length > 0 && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs space-y-2">
            <span className="font-semibold block text-[11px] text-muted-foreground">
              Previous Plan Versions ({deadline.planHistory.length}):
            </span>
            <div className="space-y-1">
              {deadline.planHistory.map((prev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/60">
                  <span className="font-mono text-[11px]">
                    v{prev.version} — {prev.providerId} ({prev.modelId})
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Generated: {new Date(prev.generatedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PLAN CONTENT SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Task Understanding, Approach, Milestones */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Task Understanding */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Target className="h-4 w-4" />
              <span>1. Task Understanding</span>
            </div>
            {isEditing ? (
              <textarea
                rows={3}
                value={editTaskUnderstanding}
                onChange={(e) => setEditTaskUnderstanding(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
              />
            ) : (
              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                {plan.taskUnderstanding}
              </p>
            )}
          </div>

          {/* 2. Suggested Approach */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
              <Compass className="h-4 w-4" />
              <span>2. Suggested Execution Approach</span>
            </div>
            {isEditing ? (
              <textarea
                rows={3}
                value={editSuggestedApproach}
                onChange={(e) => setEditSuggestedApproach(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
              />
            ) : (
              <p className="text-xs text-foreground/90 leading-relaxed">
                {plan.suggestedApproach}
              </p>
            )}
          </div>

          {/* 3. Execution Milestones */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  3. Execution Milestones ({plan.suggestedMilestones?.length || 0})
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenImport}
                className="text-xs cursor-pointer"
              >
                <Download className="h-3 w-3 mr-1 text-primary" /> Import to Checklist
              </Button>
            </div>

            <div className="space-y-2.5">
              {(isEditing ? editMilestones : plan.suggestedMilestones || []).map((m, idx) => {
                const isImported =
                  m.isImported ||
                  existingMilestoneTitles.has(m.title.trim().toLowerCase());

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-border bg-card/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {m.order || idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={m.title}
                            onChange={(e) => {
                              const updated = [...editMilestones];
                              updated[idx].title = e.target.value;
                              setEditMilestones(updated);
                            }}
                            className="h-7 px-2 rounded border border-input bg-background text-xs font-semibold text-foreground flex-1"
                          />
                        ) : (
                          <h5 className="text-xs font-semibold text-foreground truncate">
                            {m.title}
                          </h5>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.isCriticalPath && (
                          <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            Critical Path
                          </span>
                        )}
                        {isImported ? (
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" />
                            Imported
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            Not in checklist
                          </span>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={m.description || ''}
                        onChange={(e) => {
                          const updated = [...editMilestones];
                          updated[idx].description = e.target.value;
                          setEditMilestones(updated);
                        }}
                        className="w-full rounded border border-input bg-background p-2 text-xs text-muted-foreground leading-relaxed mt-1"
                      />
                    ) : (
                      m.description && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                          {m.description}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): First Actionable Step, Resources, Guidance */}
        <div className="lg:col-span-1 space-y-6">
          {/* 5. First Actionable Step */}
          <div className="p-5 rounded-xl border border-orange-500/30 bg-orange-500/5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              <Flame className="h-4 w-4" />
              <span>5. First Actionable Step</span>
            </div>
            {isEditing ? (
              <textarea
                rows={3}
                value={editFirstStep}
                onChange={(e) => setEditFirstStep(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
              />
            ) : (
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {plan.firstActionableStep}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground font-mono block pt-1">
              Complete in &lt; 15 minutes to initiate momentum.
            </span>
          </div>

          {/* 4. Required Resources */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              4. Required Resources
            </span>
            {isEditing ? (
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">
                  Comma-separated resources:
                </label>
                <textarea
                  rows={3}
                  value={editResources}
                  onChange={(e) => setEditResources(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono text-foreground"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {plan.requiredResources && plan.requiredResources.length > 0 ? (
                  plan.requiredResources.map((res, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-secondary text-foreground font-mono border border-border/80"
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Standard development environment</span>
                )}
              </div>
            )}
          </div>

          {/* Deliverable Guidance */}
          {plan.deliverableSpecificGuidance && (
            <div className="p-4 rounded-xl border border-border bg-secondary/20 shadow-sm space-y-1.5">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Deliverable Guidance ({deadline.deliverableType})
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {plan.deliverableSpecificGuidance}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MILESTONE IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  Import Milestones into Deadline Checklist
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select milestones from the approved AI execution plan to add to your checklist. Existing milestones are preserved.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {plan.suggestedMilestones?.map((m, idx) => {
                const isDuplicate = existingMilestoneTitles.has(m.title.trim().toLowerCase());
                const isSelected = selectedMilestoneIndices.includes(idx);

                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isDuplicate
                        ? 'opacity-60 bg-secondary/30 border-border/60'
                        : isSelected
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border bg-card hover:bg-secondary/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDuplicate}
                      checked={isSelected && !isDuplicate}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMilestoneIndices([...selectedMilestoneIndices, idx]);
                        } else {
                          setSelectedMilestoneIndices(selectedMilestoneIndices.filter((i) => i !== idx));
                        }
                      }}
                      className="mt-0.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {m.title}
                        </span>
                        {isDuplicate && (
                          <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                            Already in checklist
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 truncate">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {importFeedback && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {importFeedback}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImportModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={selectedMilestoneIndices.length === 0}
                className="cursor-pointer"
              >
                Import {selectedMilestoneIndices.length} Milestone(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REGENERATE CONFIRMATION DIALOG */}
      {showRegenerateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Regenerate Execution Plan</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRegenerateDialog(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Regenerating will generate a new plan version (<span className="font-semibold text-foreground font-mono">v{(plan.version || 1) + 1}</span>).
              Your existing checklist milestones and progress will <span className="font-semibold text-foreground">not</span> be erased.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  AI Provider
                </label>
                <select
                  value={regenProviderId}
                  onChange={(e) => {
                    const pId = e.target.value as AIProviderId;
                    setRegenProviderId(pId);
                    if (pId === 'gemini') {
                      const discovered = discoveredModels['gemini'];
                      setRegenModelId(discovered?.[0]?.id || 'gemini-2.0-flash');
                    } else {
                      setRegenModelId('claude-3-7-sonnet-latest');
                    }
                  }}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer"
                >
                  <option value="gemini">Google Gemini (Active)</option>
                  <option value="anthropic">Anthropic Claude (Active)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-muted-foreground block">
                    Target Model
                  </label>
                  {regenProviderId === 'gemini' && (
                    <button
                      type="button"
                      onClick={() => handleRefreshModels('gemini')}
                      disabled={Boolean(isDiscoveringModels['gemini'])}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                    >
                      <RefreshCw className={`h-3 w-3 ${isDiscoveringModels['gemini'] ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  )}
                </div>
                {regenProviderId === 'gemini' ? (
                  <select
                    value={regenModelId}
                    onChange={(e) => setRegenModelId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                  >
                    {compatibleGeminiModels.length > 0 ? (
                      compatibleGeminiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (gemini-2.0-flash)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (gemini-2.5-flash)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (gemini-1.5-flash)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (gemini-1.5-pro)</option>
                      </>
                    )}
                  </select>
                ) : (
                  <select
                    value={regenModelId}
                    onChange={(e) => setRegenModelId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                  >
                    <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet (claude-3-7-sonnet-latest)</option>
                    <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (claude-3-5-haiku-latest)</option>
                  </select>
                )}

                {/* Model capability metadata display */}
                {regenProviderId === 'gemini' && selectedRegenMeta && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                    <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">
                      ID: {selectedRegenMeta.id}
                    </span>
                    {selectedRegenMeta.inputTokenLimit && (
                      <span className="bg-background px-1.5 py-0.5 rounded border border-border">
                        Context: {selectedRegenMeta.inputTokenLimit >= 1000000 ? `${(selectedRegenMeta.inputTokenLimit / 1000000).toFixed(1)}M` : `${Math.round(selectedRegenMeta.inputTokenLimit / 1024)}K`}
                      </span>
                    )}
                    <span className="bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded border border-primary/20">
                      Text Generation
                    </span>
                  </div>
                )}
              </div>

              {/* Warning for incompatible models in regenerate dialog */}
              {isRegenModelIncompatible && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 font-medium space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Incompatible Model Selected: "{regenModelId}"</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This model is not suitable for text execution plans. Please select a compatible text generation model.
                  </p>
                  {compatibleGeminiModels.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRegenModelId(compatibleGeminiModels[0].id)}
                      className="text-xs h-7 cursor-pointer"
                    >
                      Switch to {compatibleGeminiModels[0].displayName}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {regenError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-500 font-medium">
                {regenError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRegenerateDialog(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRegenerate}
                isLoading={isRegenerating}
                disabled={isRegenerating || isRegenModelIncompatible}
                className="cursor-pointer"
              >
                Confirm &amp; Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
