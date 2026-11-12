import React, { useState, useEffect } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Deadline,
  Priority,
  DeliverableType,
  ExecutionApproach,
  ReferenceLink,
  Milestone,
  AIProviderId,
  AIExecutionPlan,
  ApprovedAIExecutionPlan,
  AIPlanMilestone,
  AIExecutionMode,
} from '@/types';
import { prototypeRegistry, PrototypeTypeDefinition } from '@/core/prototype';
import { aiExecutionService } from '@/core/ai/AIExecutionService';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { formatDate, createIsoFromLocal, formatTimeRemaining } from '@/lib/utils';
import {
  Target,
  Link2,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Presentation,
  Palette,
  Video,
  BookOpen,
  FileText,
  GraduationCap,
  Box,
  Cpu,
  Compass,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Edit2,
  Key,
  Flame,
} from 'lucide-react';

export const CreateDeadlineModal: React.FC = () => {
  const {
    isCreateModalOpen,
    closeCreateModal,
    createDeadline,
    updateDeadline,
    editingDeadline,
    configuredProviders,
    discoveredModels,
  } = useDeadlineStore();

  const isEditing = Boolean(editingDeadline);

  // Current wizard step (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('software');
  const [executionApproach, setExecutionApproach] = useState<ExecutionApproach>('prototype_first');
  const [selectedPrototypeId, setSelectedPrototypeId] = useState<string>('');
  const [prototypeConfig, setPrototypeConfig] = useState<Record<string, unknown>>({});
  const [minimumAcceptableOutput, setMinimumAcceptableOutput] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [priority, setPriority] = useState<Priority>('high');
  const [tags, setTags] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<{ title: string; url: string }[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 2 AI Integration states
  const [executionMode, setExecutionMode] = useState<AIExecutionMode>('manual');
  const [aiProviderId, setAiProviderId] = useState<AIProviderId>('gemini');
  const [aiModelId, setAiModelId] = useState<string>('gemini-2.0-flash');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<AIExecutionPlan | null>(null);
  const [isReviewingPlan, setIsReviewingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [inlineApiKey, setInlineApiKey] = useState('');
  const [hasSessionKey, setHasSessionKey] = useState(false);
  const [importMilestonesOnCreate, setImportMilestonesOnCreate] = useState(true);

  // Editable fields for review mode
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [reviewTaskUnderstanding, setReviewTaskUnderstanding] = useState('');
  const [reviewSuggestedApproach, setReviewSuggestedApproach] = useState('');
  const [reviewMilestones, setReviewMilestones] = useState<AIPlanMilestone[]>([]);
  const [reviewResources, setReviewResources] = useState('');
  const [reviewFirstStep, setReviewFirstStep] = useState('');

  // Registered prototype types from registry
  const [availablePrototypes, setAvailablePrototypes] = useState<PrototypeTypeDefinition[]>([]);

  useEffect(() => {
    // Load enabled prototypes from registry filtered by current deliverable category
    setAvailablePrototypes(prototypeRegistry.discover({ deliverableType }));
  }, [isCreateModalOpen, deliverableType]);

  // When editing or opening, populate initial values
  useEffect(() => {
    if (editingDeadline) {
      setTitle(editingDeadline.title);
      setDescription(editingDeadline.description);
      setExpectedOutput(editingDeadline.expectedOutput);
      setDeliverableType(editingDeadline.deliverableType || 'software');
      setExecutionApproach(editingDeadline.executionApproach || 'prototype_first');
      setSelectedPrototypeId(editingDeadline.selectedPrototypeId || '');
      setPrototypeConfig(editingDeadline.prototypeConfig || {});
      setMinimumAcceptableOutput(editingDeadline.minimumAcceptableOutput || '');
      setDeadlineDate(editingDeadline.deadlineDate);
      setDeadlineTime(editingDeadline.deadlineTime);
      setPriority(editingDeadline.priority);
      setTags(editingDeadline.tags?.join(', ') || '');
      setReferenceLinks(
        editingDeadline.referenceLinks.map((l) => ({ title: l.title, url: l.url }))
      );
      if (editingDeadline.aiConfig) {
        setExecutionMode(editingDeadline.aiConfig.mode || 'manual');
        if (editingDeadline.aiConfig.providerId) setAiProviderId(editingDeadline.aiConfig.providerId);
        if (editingDeadline.aiConfig.modelId) setAiModelId(editingDeadline.aiConfig.modelId);
      } else {
        setExecutionMode('manual');
      }
      setGeneratedPlan(null);
      setIsReviewingPlan(false);
      setIsEditingPlan(false);
      setPlanError(null);
      setCurrentStep(1);
    } else {
      // Default to tomorrow 11:59 PM as requested in standard demonstration scenario
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');

      setTitle('');
      setDescription('');
      setExpectedOutput('');
      setDeliverableType('software');
      setExecutionApproach('prototype_first');
      setSelectedPrototypeId('');
      setPrototypeConfig({});
      setMinimumAcceptableOutput('');
      setDeadlineDate(`${yyyy}-${mm}-${dd}`);
      setDeadlineTime('23:59');
      setPriority('high');
      setTags('');
      setReferenceLinks([]);
      setExecutionMode('manual');
      setGeneratedPlan(null);
      setIsReviewingPlan(false);
      setIsEditingPlan(false);
      setPlanError(null);
      setInlineApiKey('');
      setCurrentStep(1);
    }
    setErrors({});
  }, [editingDeadline, isCreateModalOpen]);

  // Session key checking effect
  useEffect(() => {
    let isMounted = true;
    const checkKey = async () => {
      const exists = await credentialStorage.hasSecret(`ai_key_${aiProviderId}`);
      if (isMounted) {
        setHasSessionKey(exists);
      }
    };
    checkKey();
    return () => {
      isMounted = false;
    };
  }, [aiProviderId, isCreateModalOpen]);

  // Default model synchronizer
  useEffect(() => {
    if (aiProviderId === 'gemini') {
      const geminiDiscovered = (discoveredModels['gemini'] || []).filter((m) => {
        const id = m.id.toLowerCase();
        const name = (m.displayName || '').toLowerCase();
        return (
          !id.includes('tts') &&
          !name.includes('tts') &&
          !id.includes('speech') &&
          !id.includes('audio') &&
          !id.includes('embed') &&
          !id.includes('imagen') &&
          id !== 'aqa'
        );
      });
      const selectedId = configuredProviders['gemini']?.selectedModelId;
      const isSelectedCompatible = selectedId && geminiDiscovered.some((m) => m.id === selectedId);
      const defaultModel = isSelectedCompatible ? selectedId : (geminiDiscovered?.[0]?.id || 'gemini-2.0-flash');
      setAiModelId(defaultModel);
    } else if (aiProviderId === 'anthropic') {
      setAiModelId('claude-3-7-sonnet-latest');
    }
  }, [aiProviderId, configuredProviders, discoveredModels]);

  // Validation per step
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) errs.title = 'Project name is required';
      if (!expectedOutput.trim()) errs.expectedOutput = 'Expected final output is required';
    } else if (step === 2) {
      if (!deliverableType) errs.deliverableType = 'Please select a deliverable category';
    } else if (step === 3) {
      if (!executionApproach) errs.executionApproach = 'Please select an execution approach';
    } else if (step === 5) {
      if (!expectedOutput.trim()) errs.expectedOutput = 'Expected output is required';
    } else if (step === 6) {
      if (!deadlineDate) errs.deadlineDate = 'Deadline date is required';
      if (!deadlineTime) errs.deadlineTime = 'Deadline time is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setReferenceLinks([
      ...referenceLinks,
      {
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`,
      },
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    setReferenceLinks(referenceLinks.filter((_, i) => i !== index));
  };

  const handleGeneratePlanInModal = async () => {
    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      if (!title.trim() || !expectedOutput.trim() || !deadlineDate || !deadlineTime) {
        throw new Error(
          'Please ensure Project Title, Target Expected Output, and Due Date/Time are filled before generating the plan.'
        );
      }

      let key = await credentialStorage.getSecret(`ai_key_${aiProviderId}`);
      if (!key && inlineApiKey.trim()) {
        key = inlineApiKey.trim();
        await credentialStorage.saveSecret(`ai_key_${aiProviderId}`, key);
        setHasSessionKey(true);
      }

      if (!key) {
        throw new Error(
          `No active API key in session memory for ${
            aiProviderId === 'gemini' ? 'Google Gemini' : 'Anthropic'
          }. Please enter your API key below.`
        );
      }

      const tempDeadline: Deadline = {
        id: `dl_temp_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        expectedOutput: expectedOutput.trim(),
        minimumAcceptableOutput: minimumAcceptableOutput.trim() || undefined,
        deadlineDate,
        deadlineTime,
        dueDateTime: createIsoFromLocal(deadlineDate, deadlineTime),
        priority,
        status: 'in_progress',
        progress: 0,
        deliverableType,
        executionApproach,
        selectedPrototypeId: selectedPrototypeId || undefined,
        referenceLinks: referenceLinks.map((l, idx) => ({
          id: `ref_${idx}`,
          title: l.title,
          url: l.url,
          createdAt: new Date().toISOString(),
        })),
        attachments: [],
        milestones: [],
        notes: '',
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const plan = await aiExecutionService.generateExecutionPlan(
        tempDeadline,
        aiProviderId,
        key,
        configuredProviders[aiProviderId]?.baseUrl,
        aiModelId
      );

      setGeneratedPlan(plan);
      setReviewTaskUnderstanding(plan.taskUnderstanding);
      setReviewSuggestedApproach(plan.suggestedApproach);
      setReviewMilestones(
        plan.suggestedMilestones.map((m) => ({
          title: m.title,
          description: m.description,
          order: m.order,
          isCriticalPath: m.isCriticalPath,
        }))
      );
      setReviewResources(plan.requiredResources.join(', '));
      setReviewFirstStep(plan.firstActionableStep);
      setIsReviewingPlan(true);
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const links: ReferenceLink[] = referenceLinks.map((l, idx) => ({
        id: `ref_${Date.now()}_${idx}`,
        title: l.title,
        url: l.url,
        createdAt: new Date().toISOString(),
      }));

      const dueDateTime = createIsoFromLocal(deadlineDate, deadlineTime);

      let approvedPlanData: ApprovedAIExecutionPlan | undefined = undefined;
      let initialMilestones: Milestone[] = [];

      if (executionMode === 'ai_assisted' && generatedPlan) {
        const nowIso = new Date().toISOString();
        approvedPlanData = {
          id: `plan_${Date.now()}`,
          deadlineId: editingDeadline?.id || `dl_${Date.now()}`,
          providerId: aiProviderId,
          modelId: aiModelId,
          generatedAt: generatedPlan.generatedAt,
          approvedAt: nowIso,
          version: 1,
          approvalStatus: 'approved',
          taskUnderstanding: reviewTaskUnderstanding.trim(),
          suggestedApproach: reviewSuggestedApproach.trim(),
          suggestedMilestones: reviewMilestones,
          requiredResources: reviewResources
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
          firstActionableStep: reviewFirstStep.trim(),
          deliverableSpecificGuidance: generatedPlan.deliverableSpecificGuidance,
          isEditedByUser: isEditingPlan,
          latencyMs: generatedPlan.latencyMs,
        };

        if (importMilestonesOnCreate) {
          initialMilestones = reviewMilestones.map((m, idx) => ({
            id: `ms_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            deadlineId: editingDeadline?.id || `dl_${Date.now()}`,
            title: m.title.trim(),
            description: m.description ? m.description.trim() : undefined,
            isCompleted: false,
            order: m.order || idx + 1,
            isCriticalPath: Boolean(m.isCriticalPath),
            createdAt: nowIso,
            updatedAt: nowIso,
          }));
        }
      }

      if (isEditing && editingDeadline) {
        const updates: Partial<Deadline> = {
          title: title.trim(),
          description: description.trim(),
          expectedOutput: expectedOutput.trim(),
          minimumAcceptableOutput: minimumAcceptableOutput.trim() || undefined,
          deadlineDate,
          deadlineTime,
          dueDateTime,
          priority,
          deliverableType,
          executionApproach,
          selectedPrototypeId: selectedPrototypeId || undefined,
          prototypeConfig: Object.keys(prototypeConfig).length > 0 ? prototypeConfig : undefined,
          tags: parsedTags,
          referenceLinks: links,
        };

        if (approvedPlanData) {
          updates.approvedPlan = approvedPlanData;
          updates.aiConfig = {
            mode: executionMode,
            providerId: aiProviderId,
            modelId: aiModelId,
          };
          if (importMilestonesOnCreate && initialMilestones.length > 0) {
            updates.milestones = [...editingDeadline.milestones, ...initialMilestones];
          }
        }

        await updateDeadline(editingDeadline.id, updates);
      } else {
        await createDeadline({
          title: title.trim(),
          description: description.trim(),
          expectedOutput: expectedOutput.trim(),
          minimumAcceptableOutput: minimumAcceptableOutput.trim() || undefined,
          deadlineDate,
          deadlineTime,
          dueDateTime,
          priority,
          status: 'in_progress',
          progress: 0,
          deliverableType,
          executionApproach,
          selectedPrototypeId: selectedPrototypeId || undefined,
          prototypeConfig: Object.keys(prototypeConfig).length > 0 ? prototypeConfig : undefined,
          milestones: initialMilestones,
          referenceLinks: links,
          attachments: [],
          tags: parsedTags,
          notes: '',
          aiConfig: {
            mode: executionMode,
            providerId: executionMode === 'ai_assisted' ? aiProviderId : undefined,
            modelId: executionMode === 'ai_assisted' ? aiModelId : undefined,
          },
          approvedPlan: approvedPlanData,
        });
      }
      closeCreateModal();
    } catch (err) {
      console.error('Failed to save deadline', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliverableOptions: {
    type: DeliverableType;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      type: 'software',
      label: 'Software / Application',
      description: 'Web apps, backend services, mobile apps, or feature PRs',
      icon: Code2,
    },
    {
      type: 'presentation',
      label: 'Presentation',
      description: 'Slide decks, investor pitches, keynote presentations',
      icon: Presentation,
    },
    {
      type: 'assignment',
      label: 'College Assignment',
      description: 'University projects, problem sets, academic deliverables',
      icon: GraduationCap,
    },
    {
      type: 'research_paper',
      label: 'Research Paper',
      description: 'Conference papers, journal manuscripts, theses, LaTeX docs',
      icon: BookOpen,
    },
    {
      type: 'report',
      label: 'Report / Document',
      description: 'Executive summaries, analytical reports, technical specs',
      icon: FileText,
    },
    {
      type: 'design',
      label: 'Image / Graphic',
      description: 'Design mockups, UI components, brand identities, posters',
      icon: Palette,
    },
    {
      type: 'video',
      label: 'Video / Reel',
      description: 'Product demos, walkthrough videos, promotional reels',
      icon: Video,
    },
    {
      type: 'other',
      label: 'Other Deliverable',
      description: 'Custom deliverables or multidisciplinary projects',
      icon: Box,
    },
  ];

  const approachOptions: {
    approach: ExecutionApproach;
    title: string;
    tag: string;
    tagColor: string;
    description: string;
    icon: React.ElementType;
    philosophyQuote: string;
  }[] = [
    {
      approach: 'prototype_first',
      title: 'Prototype First',
      tag: 'Recommended for Urgency',
      tagColor: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      description:
        'Build a minimum working prototype before expanding functionality. Proves core operations and prevents zero-output failure.',
      icon: Cpu,
      philosophyQuote:
        'e.g. Build basic arithmetic calculator operations before adding memory stacks.',
    },
    {
      approach: 'output_only',
      title: 'Output Only',
      tag: 'Direct Focus',
      tagColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      description:
        'You already know exactly what needs to be delivered. The platform focuses exclusively on the expected output and submission.',
      icon: Target,
      philosophyQuote:
        'Clear specification with no intermediate discovery needed.',
    },
    {
      approach: 'guided_execution',
      title: 'Guided Execution',
      tag: 'Structured Steps',
      tagColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description:
        'Break the work into phased milestones and manageable checkpoints for methodical delivery tracking.',
      icon: Compass,
      philosophyQuote:
        'Systematic progression for complex or multi-part assignments.',
    },
  ];

  const stepTitles = [
    'Define Work',
    'Category',
    'Approach',
    'Prototype',
    'Success Criteria',
    'Schedule',
    'Review & Create',
  ];

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={closeCreateModal}
      title={isEditing ? 'Edit Deadline' : 'Create Deadline'}
      description="Work. Build. Deliver. Define your target output and execution approach."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Step Progress Tracker */}
        <div className="border-b border-border pb-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span className="font-mono text-primary font-semibold">
              STEP {currentStep} OF 7: {stepTitles[currentStep - 1].toUpperCase()}
            </span>
            <span className="text-[11px]">
              {Math.round((currentStep / 7) * 100)}% complete
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {stepTitles.map((st, idx) => {
              const stepNum = idx + 1;
              const isPast = stepNum < currentStep;
              const isCurr = stepNum === currentStep;

              return (
                <button
                  key={st}
                  type="button"
                  disabled={!isPast && stepNum !== currentStep}
                  onClick={() => {
                    if (isPast) setCurrentStep(stepNum);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurr
                      ? 'bg-primary'
                      : isPast
                      ? 'bg-primary/50 hover:bg-primary/70 cursor-pointer'
                      : 'bg-secondary'
                  }`}
                  title={`Step ${stepNum}: ${st}`}
                />
              );
            })}
          </div>
        </div>

        {/* Step Content Area */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {/* STEP 1: DEFINE YOUR WORK */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  What do you need to deliver?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define the core project and the tangible deliverable you must produce.
                </p>
              </div>

              <Input
                label="Project Name *"
                placeholder="e.g. Calculator Application, Series Seed Deck, Thesis Evaluation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                autoFocus
              />

              <div className="space-y-1.5 p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  <Target className="h-3.5 w-3.5" />
                  <span>Expected Final Output * (The Output Matters Most)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Describe what done looks like in plain language.
                </p>
                <Textarea
                  placeholder="e.g. A working calculator application prototype hosted on Vercel with clean arithmetic keyboard shortcuts and unit tests."
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  error={errors.expectedOutput}
                  rows={2}
                />
              </div>

              <Textarea
                label="Short Description (Context)"
                placeholder="Why are you building this? Who is grading or reviewing it?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* STEP 2: DELIVERABLE SELECTION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Select Deliverable Category
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose the medium of your target output.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {deliverableOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = deliverableType === opt.type;

                  return (
                    <button
                      type="button"
                      key={opt.type}
                      onClick={() => setDeliverableType(opt.type)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`block text-xs font-semibold ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: EXECUTION APPROACH SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Choose Execution Approach
                </h3>
                <p className="text-xs text-muted-foreground">
                  How should Deadline guide your execution strategy toward the finish line?
                </p>
              </div>

              <div className="space-y-3">
                {approachOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = executionApproach === opt.approach;

                  return (
                    <button
                      type="button"
                      key={opt.approach}
                      onClick={() => setExecutionApproach(opt.approach)}
                      className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-semibold tracking-tight ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {opt.title}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${opt.tagColor}`}
                          >
                            {opt.tag}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {opt.description}
                        </p>

                        <p className="text-[11px] text-foreground/80 font-mono mt-1.5 italic">
                          {opt.philosophyQuote}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: PROTOTYPE SELECTION ARCHITECTURE */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    Prototype Selection Architecture
                  </h3>
                  <Badge variant="subtle" size="sm">
                    Registry-Driven
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect an extensible prototype blueprint to guide execution, or proceed with standard delivery.
                </p>
              </div>

              {availablePrototypes.length === 0 ? (
                /* Polished Empty State as explicitly required */
                <div className="p-6 rounded-xl border border-dashed border-border bg-card text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Prototype Type Registry Active
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                      Prototype blueprints for{' '}
                      <span className="font-semibold text-foreground capitalize">
                        {deliverableType.replace('_', ' ')}
                      </span>{' '}
                      will be configured in a subsequent development phase. Existing and new deadlines continue working seamlessly without requiring a blueprint selection.
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs text-foreground font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>
                        Proceeding with:{' '}
                        {executionApproach === 'prototype_first'
                          ? 'Prototype First Approach'
                          : executionApproach === 'guided_execution'
                          ? 'Guided Execution'
                          : 'Output Only Execution'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dynamic prototype cards generated from registry */
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPrototypeId('')}
                    className={`w-full p-3 rounded-lg border text-left text-xs transition-all ${
                      !selectedPrototypeId
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>None / Custom Prototype (Proceed with manual execution)</span>
                  </button>

                  {availablePrototypes.map((proto) => {
                    const isSelected = selectedPrototypeId === proto.id;

                    return (
                      <button
                        type="button"
                        key={proto.id}
                        onClick={() => setSelectedPrototypeId(proto.id)}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            {proto.name}
                          </span>
                          {proto.badge && (
                            <Badge variant="subtle" size="sm">
                              {proto.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {proto.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DEFINE SUCCESS */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Define Success: Target vs. Minimum Acceptable Output
                </h3>
                <p className="text-xs text-muted-foreground">
                  Keep your primary goal distinct from your emergency fallback output.
                </p>
              </div>

              {/* Expected Output */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    <Target className="h-4 w-4" />
                    <span>Expected Final Output * (The Primary Target)</span>
                  </div>
                  <Badge variant="subtle">Target Goal</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  What does the user ultimately need to deliver?
                </p>
                <Textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="e.g. A working calculator application prototype with clean operations and responsive keypad"
                  rows={2}
                  error={errors.expectedOutput}
                />
              </div>

              {/* Minimum Acceptable Output (MVP) */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Minimum Acceptable Output (MVP Fallback)</span>
                  </div>
                  <Badge variant="subtle">Fallback Scope</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  What is the smallest acceptable result if time becomes limited? Delivering this prevents total failure.
                </p>
                <Textarea
                  value={minimumAcceptableOutput}
                  onChange={(e) => setMinimumAcceptableOutput(e.target.value)}
                  placeholder="e.g. Basic arithmetic calculator supporting +, -, *, / without history log"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* STEP 6: DEADLINE CONFIGURATION */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Schedule & Priority Configuration
                </h3>
                <p className="text-xs text-muted-foreground">
                  Set the delivery date, hard cutoff time, and priority ranking.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    Deadline Date *
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {errors.deadlineDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.deadlineDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    Cutoff Time *
                  </label>
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {errors.deadlineTime && (
                    <p className="text-xs text-red-500 mt-1">{errors.deadlineTime}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                        priority === p
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Tags (Optional, comma-separated)"
                placeholder="college, prototype, calculator, react"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />

              {/* Reference Links */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Link2 className="inline h-3.5 w-3.5 mr-1" />
                  Reference Links (Rubrics, Docs, Repos)
                </label>

                {referenceLinks.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {referenceLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border/60 text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold text-foreground">{link.title}: </span>
                          <span className="text-primary truncate">{link.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="text-muted-foreground hover:text-red-500 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Link Title (e.g. Spec Doc)"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="h-8 flex-1 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="h-8 flex-2 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleAddLink}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW AND CREATE */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Review & Confirm Deadline
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verify your execution plan. You can edit any parameter prior to starting.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-sm">
                <div className="flex items-start justify-between pb-3 border-b border-border/60">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                      Project
                    </span>
                    <h4 className="text-base font-bold text-foreground">{title}</h4>
                    {description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Category
                    </span>
                    <span className="font-semibold capitalize text-foreground">
                      {deliverableType.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Execution Approach
                    </span>
                    <span className="font-semibold capitalize text-primary">
                      {executionApproach.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Priority
                    </span>
                    <Badge priority={priority} size="sm">
                      {priority}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Due Date & Time
                    </span>
                    <span className="font-semibold font-mono text-foreground">
                      {formatDate(deadlineDate)} at {deadlineTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Prototype Mode
                    </span>
                    <span className="font-mono text-foreground">
                      {selectedPrototypeId || 'Standard Execution'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Countdown Preview
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      {formatTimeRemaining(createIsoFromLocal(deadlineDate, deadlineTime)).formatted}
                    </span>
                  </div>
                </div>

                {/* Target Deliverable */}
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 text-xs">
                  <span className="font-semibold text-orange-600 dark:text-orange-400 block uppercase tracking-wider text-[10px]">
                    Expected Deliverable (Output)
                  </span>
                  <p className="font-medium text-foreground mt-0.5">{expectedOutput}</p>
                </div>

                {/* Fallback MVP */}
                {minimumAcceptableOutput && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs">
                    <span className="font-semibold text-muted-foreground block uppercase tracking-wider text-[10px]">
                      Minimum Acceptable Output (MVP Fallback)
                    </span>
                    <p className="font-medium text-foreground mt-0.5">
                      {minimumAcceptableOutput}
                    </p>
                  </div>
                )}
              </div>

              {/* CHOOSE EXECUTION MODE (Phase 2 Requirement) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    Choose Execution Mode
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Define how you will plan and produce this deliverable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode 1: Work Manually */}
                  <div
                    onClick={() => {
                      setExecutionMode('manual');
                      setIsReviewingPlan(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      executionMode === 'manual'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                        : 'border-border bg-card hover:bg-secondary/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Work Manually</span>
                        {executionMode === 'manual' && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Manage your own milestones, checklists, and delivery progress independently.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Standard Workflow
                    </span>
                  </div>

                  {/* Mode 2: AI-Assisted Planning */}
                  <div
                    onClick={() => setExecutionMode('ai_assisted')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      executionMode === 'ai_assisted'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                        : 'border-border bg-card hover:bg-secondary/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>AI-Assisted</span>
                        </span>
                        {executionMode === 'ai_assisted' && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Synthesize an actionable execution roadmap, sequenced milestones, and first step.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-primary font-semibold">
                      Live AI Copilot
                    </span>
                  </div>

                  {/* Mode 3: AI + IDE (Deferred / Future-Ready) */}
                  <div
                    className="p-3.5 rounded-xl border border-dashed border-border/80 bg-secondary/20 opacity-60 cursor-not-allowed flex flex-col justify-between space-y-2 select-none"
                    title="IDE handoff and local agent bridge will be introduced in the next phase. Deadline does not pretend to control your IDE."
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>AI + IDE</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Local companion agent and IDE handoff. Coming in next development phase.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Deferred
                    </span>
                  </div>
                </div>
              </div>

              {/* AI CONFIGURATION & GENERATION (Visible when AI-Assisted Planning is selected) */}
              {executionMode === 'ai_assisted' && !isReviewingPlan && (
                <div className="p-4 rounded-xl border border-primary/30 bg-card space-y-4 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Configure AI Execution Copilot
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Real-time synthesis
                    </span>
                  </div>

                  {/* Provider & Model Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        AI Provider
                      </label>
                      <select
                        value={aiProviderId}
                        onChange={(e) => {
                          const pId = e.target.value as AIProviderId;
                          setAiProviderId(pId);
                        }}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer"
                      >
                        <option value="gemini">Google Gemini (Active)</option>
                        <option value="anthropic">Anthropic Claude (Active)</option>
                        <option value="openai" disabled>
                          OpenAI (Phase 3 - Unavailable)
                        </option>
                        <option value="openai_compatible" disabled>
                          OpenAI-Compatible (Phase 3 - Unavailable)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Model
                      </label>
                      {aiProviderId === 'gemini' ? (
                        <select
                          value={aiModelId}
                          onChange={(e) => setAiModelId(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                        >
                          {(discoveredModels['gemini'] || [])
                            .filter((m) => {
                              const id = m.id.toLowerCase();
                              const name = (m.displayName || '').toLowerCase();
                              return (
                                !id.includes('tts') &&
                                !name.includes('tts') &&
                                !id.includes('speech') &&
                                !id.includes('audio') &&
                                !id.includes('embed') &&
                                !id.includes('imagen') &&
                                id !== 'aqa'
                              );
                            }).length > 0 ? (
                            (discoveredModels['gemini'] || [])
                              .filter((m) => {
                                const id = m.id.toLowerCase();
                                const name = (m.displayName || '').toLowerCase();
                                return (
                                  !id.includes('tts') &&
                                  !name.includes('tts') &&
                                  !id.includes('speech') &&
                                  !id.includes('audio') &&
                                  !id.includes('embed') &&
                                  !id.includes('imagen') &&
                                  id !== 'aqa'
                                );
                              })
                              .map((m) => (
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
                          value={aiModelId}
                          onChange={(e) => setAiModelId(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono cursor-pointer"
                        >
                          <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</option>
                          <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
                          <option value="claude-3-opus-latest">Claude 3 Opus</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Session Key Warning/Prompt if missing */}
                  {!hasSessionKey && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Key className="h-3.5 w-3.5" />
                        <span>No key in session memory for {aiProviderId === 'gemini' ? 'Google Gemini' : 'Anthropic'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Enter your API key below to load it into volatile browser memory:
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="password"
                          placeholder={aiProviderId === 'gemini' ? 'AIzaSy...' : 'sk-ant-...'}
                          value={inlineApiKey}
                          onChange={(e) => setInlineApiKey(e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded border border-input bg-background text-xs font-mono"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            if (inlineApiKey.trim()) {
                              await credentialStorage.saveSecret(`ai_key_${aiProviderId}`, inlineApiKey.trim());
                              setHasSessionKey(true);
                            }
                          }}
                        >
                          Save to Memory
                        </Button>
                      </div>
                    </div>
                  )}

                  {planError && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-500 font-medium">
                      {planError}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleGeneratePlanInModal}
                    isLoading={isGeneratingPlan}
                    className="w-full justify-center shadow-sm font-semibold cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Generate AI Execution Plan
                  </Button>
                </div>
              )}

              {/* PLAN REVIEW & APPROVAL INTERFACE (Section 5 Requirement) */}
              {executionMode === 'ai_assisted' && isReviewingPlan && generatedPlan && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-card space-y-4 shadow-md animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Review AI Execution Plan
                      </h4>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {generatedPlan.latencyMs !== undefined && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Latency: {generatedPlan.latencyMs} ms
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingPlan(!isEditingPlan)}
                        className="text-xs text-primary"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        {isEditingPlan ? 'Done Editing' : 'Edit Content'}
                      </Button>
                    </div>
                  </div>

                  {/* 1. Task Understanding */}
                  <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border">
                    <span className="text-[11px] font-bold text-primary uppercase block">
                      1. Task Understanding
                    </span>
                    {isEditingPlan ? (
                      <textarea
                        rows={2}
                        value={reviewTaskUnderstanding}
                        onChange={(e) => setReviewTaskUnderstanding(e.target.value)}
                        className="w-full rounded border border-input bg-background p-2 text-xs leading-relaxed"
                      />
                    ) : (
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {reviewTaskUnderstanding}
                      </p>
                    )}
                  </div>

                  {/* 2. Suggested Approach */}
                  <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border">
                    <span className="text-[11px] font-bold text-amber-500 uppercase block">
                      2. Suggested Execution Approach
                    </span>
                    {isEditingPlan ? (
                      <textarea
                        rows={2}
                        value={reviewSuggestedApproach}
                        onChange={(e) => setReviewSuggestedApproach(e.target.value)}
                        className="w-full rounded border border-input bg-background p-2 text-xs leading-relaxed"
                      />
                    ) : (
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {reviewSuggestedApproach}
                      </p>
                    )}
                  </div>

                  {/* 3. Execution Milestones */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-foreground uppercase block">
                      3. Execution Milestones ({reviewMilestones.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {reviewMilestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2 rounded bg-background border border-border text-xs"
                        >
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {m.order || idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            {isEditingPlan ? (
                              <input
                                type="text"
                                value={m.title}
                                onChange={(e) => {
                                  const updated = [...reviewMilestones];
                                  updated[idx].title = e.target.value;
                                  setReviewMilestones(updated);
                                }}
                                className="w-full h-6 px-1.5 rounded border border-input bg-background text-xs font-semibold"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-foreground truncate">{m.title}</span>
                                {m.isCriticalPath && (
                                  <span className="text-[9px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20 shrink-0">
                                    Critical Path
                                  </span>
                                )}
                              </div>
                            )}
                            {m.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {m.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Required Resources */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-foreground uppercase block">
                      4. Required Resources
                    </span>
                    {isEditingPlan ? (
                      <input
                        type="text"
                        value={reviewResources}
                        onChange={(e) => setReviewResources(e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-input bg-background text-xs font-mono"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {reviewResources.split(',').map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-secondary text-foreground font-mono border border-border"
                          >
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. First Actionable Step */}
                  <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-1">
                    <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      <span>5. First Actionable Step (&lt; 15 Min)</span>
                    </span>
                    {isEditingPlan ? (
                      <textarea
                        rows={2}
                        value={reviewFirstStep}
                        onChange={(e) => setReviewFirstStep(e.target.value)}
                        className="w-full rounded border border-input bg-background p-2 text-xs leading-relaxed"
                      />
                    ) : (
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {reviewFirstStep}
                      </p>
                    )}
                  </div>

                  {/* Import Checkbox */}
                  <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={importMilestonesOnCreate}
                      onChange={(e) => setImportMilestonesOnCreate(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-foreground font-medium">
                      Import these {reviewMilestones.length} milestones directly into Deadline checklist
                    </span>
                  </label>

                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsReviewingPlan(false);
                        setGeneratedPlan(null);
                      }}
                      className="text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      ← Back / Reconfigure
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePlanInModal}
                      isLoading={isGeneratingPlan}
                      className="text-xs cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={closeCreateModal}>
                Cancel
              </Button>
            )}

            <div className="flex items-center gap-2">
              {currentStep < 7 ? (
                <Button type="button" variant="primary" size="sm" onClick={handleNext}>
                  Next <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : executionMode === 'ai_assisted' && !isReviewingPlan ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleGeneratePlanInModal}
                  isLoading={isGeneratingPlan}
                  className="cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Generate AI Plan
                </Button>
              ) : (
                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="cursor-pointer">
                  <Check className="h-4 w-4 mr-1.5" />
                  {isReviewingPlan
                    ? 'Accept Plan & Start Execution'
                    : isEditing
                    ? 'Save Changes'
                    : 'Start Execution'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
