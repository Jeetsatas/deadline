import React, { useState, useEffect } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { aiExecutionService } from '@/core/ai/AIExecutionService';
import { credentialStorage } from '@/core/security/SessionMemoryCredentialStore';
import { Deadline, DeliverableType, Priority } from '@/types';
import { AIExecutionPlan } from '@/core/ai/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  Compass,
  Code2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Flame,
  Layers,
  Key,
} from 'lucide-react';

export const AIExecutionPlanLab: React.FC = () => {
  const { configuredProviders, discoveredModels } = useDeadlineStore();

  // Compute tomorrow's date string YYYY-MM-DD
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Test Deadline Parameters
  const [title, setTitle] = useState('Build a Calculator Application');
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('software');
  const [expectedOutput, setExpectedOutput] = useState('A fully working calculator application.');
  const [minimumAcceptableOutput, setMinimumAcceptableOutput] = useState('Basic arithmetic calculator.');
  const [priority, setPriority] = useState<Priority>('high');
  const [deadlineDate, setDeadlineDate] = useState(tomorrowIso);
  const [deadlineTime, setDeadlineTime] = useState('23:59');

  // Provider & Model
  const geminiConfig = configuredProviders['gemini'];
  const geminiDiscovered = discoveredModels['gemini'] || [];
  
  const [selectedModel, setSelectedModel] = useState<string>(
    geminiConfig?.selectedModelId || geminiDiscovered[0]?.id || 'gemini-2.0-flash'
  );
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);

  // API Key in memory
  const [hasKeyInMemory, setHasKeyInMemory] = useState(false);
  const [manualApiKey, setManualApiKey] = useState('');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [planResult, setPlanResult] = useState<AIExecutionPlan | null>(null);
  const [errorResult, setErrorResult] = useState<{ message: string; rawError?: string; status?: number } | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [executionLatency, setExecutionLatency] = useState<number | null>(null);

  // Check key in memory
  useEffect(() => {
    let isMounted = true;
    const checkKey = async () => {
      const stored = await credentialStorage.getSecret('ai_key_gemini');
      if (isMounted) {
        setHasKeyInMemory(Boolean(stored));
      }
    };
    checkKey();
    return () => {
      isMounted = false;
    };
  }, [configuredProviders]);

  // Sync selected model from provider config or discovery if not manually changed
  useEffect(() => {
    if (!isCustomModel) {
      const activeModelId = geminiConfig?.selectedModelId || geminiDiscovered[0]?.id || 'gemini-2.0-flash';
      setSelectedModel(activeModelId);
    }
  }, [geminiConfig?.selectedModelId, geminiDiscovered, isCustomModel]);

  const handleRunExecutionPlan = async () => {
    setIsRunning(true);
    setErrorResult(null);
    setPlanResult(null);
    setExecutionLatency(null);

    const startTime = performance.now();

    try {
      // 1. Retrieve API key from session memory or manual input
      let apiKey = await credentialStorage.getSecret('ai_key_gemini');
      if (!apiKey && manualApiKey.trim()) {
        apiKey = manualApiKey.trim();
        await credentialStorage.saveSecret('ai_key_gemini', apiKey);
        setHasKeyInMemory(true);
      }

      if (!apiKey) {
        throw new Error(
          'No Google Gemini API key found in session memory. Please enter your API key in the Gemini integration card above or enter it below.'
        );
      }

      // 2. Determine target model
      const effectiveModel = (isCustomModel && customModelInput.trim())
        ? customModelInput.trim()
        : selectedModel;

      // 3. Assemble target Deadline object
      const sampleDeadline: Deadline = {
        id: `dl_test_${Date.now()}`,
        title: title.trim(),
        description: 'Build a responsive calculator application with full keyboard support, precision arithmetic, and clean user experience.',
        expectedOutput: expectedOutput.trim(),
        minimumAcceptableOutput: minimumAcceptableOutput.trim(),
        priority,
        status: 'in_progress',
        deadlineDate,
        deadlineTime,
        dueDateTime: `${deadlineDate}T${deadlineTime}:00.000Z`,
        progress: 0,
        deliverableType,
        executionApproach: 'prototype_first',
        referenceLinks: [
          {
            id: 'ref_calc_1',
            title: 'Project Specification & Grading Criteria',
            url: 'https://calculator-spec.internal/rubric',
            createdAt: new Date().toISOString(),
          },
        ],
        attachments: [],
        milestones: [
          {
            id: 'ms_core',
            deadlineId: 'dl_test_sample',
            title: 'Setup core arithmetic logic & evaluation engine',
            isCompleted: false,
            order: 1,
            isCriticalPath: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        notes: '',
        tags: ['calculator', 'gemini-test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 4. Send actual structured context to Google Gemini
      const plan = await aiExecutionService.generateExecutionPlan(
        sampleDeadline,
        'gemini',
        apiKey,
        geminiConfig?.baseUrl,
        effectiveModel
      );

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionLatency(plan.latencyMs || elapsed);
      setPlanResult(plan);
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionLatency(elapsed);
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorResult({
        message: errMsg,
        rawError: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3 w-3" />
            <span>Development Testing Lab</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            AI Execution-Plan Generation with Google Gemini
          </h2>
          <p className="text-xs text-muted-foreground">
            Test real-time structured execution-plan generation using your session API key and active Gemini model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasKeyInMemory ? (
            <Badge variant="outline" className="gap-1.5 py-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Key Loaded in Session Memory</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
              <Key className="h-3.5 w-3.5" />
              <span>No Key in Session</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Manual Key Fallback if memory key is not set */}
      {!hasKeyInMemory && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Enter Gemini API Key to Run Test</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Session memory is empty. Enter your API key below or save it in the Google Gemini card above.
          </p>
          <div className="flex items-center gap-2 max-w-md pt-1">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={manualApiKey}
              onChange={(e) => setManualApiKey(e.target.value)}
              className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-xs font-mono"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (manualApiKey.trim()) {
                  await credentialStorage.saveSecret('ai_key_gemini', manualApiKey.trim());
                  setHasKeyInMemory(true);
                }
              }}
            >
              Load into Memory
            </Button>
          </div>
        </div>
      )}

      {/* Model Selection Row */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-primary" />
            <span>Target Gemini Model:</span>
          </label>
          <button
            type="button"
            onClick={() => setIsCustomModel(!isCustomModel)}
            className="text-[11px] text-primary hover:underline font-mono cursor-pointer self-start sm:self-auto"
          >
            {isCustomModel ? '← Select from Discovered Models' : 'Type Custom Model ID (e.g. gemini-3.5-flash)'}
          </button>
        </div>

        {isCustomModel ? (
          <div className="space-y-1">
            <input
              type="text"
              placeholder="e.g. gemini-3.5-flash or gemini-2.0-flash"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs font-mono text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">
              You can test any valid Gemini model ID available to your Google AI Studio account.
            </p>
          </div>
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs font-mono text-foreground cursor-pointer"
          >
            {geminiDiscovered.length > 0 ? (
              geminiDiscovered.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.id})
                </option>
              ))
            ) : (
              <>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (gemini-2.0-flash)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash Preview (gemini-2.5-flash)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (gemini-1.5-flash)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (gemini-1.5-pro)</option>
              </>
            )}
          </select>
        )}
      </div>

      {/* Preset Test Deadline Parameters Form */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span>Sample Deadline Payload (Pre-populated)</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Category: {deliverableType.toUpperCase()} | Priority: {priority.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Deliverable Category
            </label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer"
            >
              <option value="software">Software / Application</option>
              <option value="prototype">Rapid Prototype</option>
              <option value="presentation">Executive Presentation</option>
              <option value="research_paper">Research Paper</option>
              <option value="report">Consulting / Technical Report</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Target Expected Output
            </label>
            <input
              type="text"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Minimum Acceptable Output (Emergency MVP)
            </label>
            <input
              type="text"
              value={minimumAcceptableOutput}
              onChange={(e) => setMinimumAcceptableOutput(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs cursor-pointer"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Target Due Date & Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs"
              />
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-24 h-8 px-2 rounded-md border border-input bg-background text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleRunExecutionPlan}
          isLoading={isRunning}
          className="w-full justify-center shadow-md font-semibold text-xs py-2.5 cursor-pointer"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Contacting Google Gemini API & Generating Structured Plan...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4 fill-current" />
              <span>
                Send Context & Generate Execution Plan with {isCustomModel ? customModelInput || 'Custom' : selectedModel}
              </span>
            </span>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {errorResult && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Execution Plan Generation Failed</span>
            </div>
            {executionLatency !== null && (
              <span className="text-[11px] font-mono text-muted-foreground">
                Latency: {executionLatency} ms
              </span>
            )}
          </div>
          <p className="text-xs text-foreground font-medium">{errorResult.message}</p>
          <div className="text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/80">
            <p className="font-semibold text-foreground mb-1">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>If 404 (Not Found): The specified model ID may not exist or require preview access. Select an available discovered model such as <code>gemini-2.0-flash</code>.</li>
              <li>If 401 (Invalid Key): Verify your API key from Google AI Studio.</li>
              <li>If 429 (Resource Exhausted): Rate limit exceeded. Wait a few seconds and retry.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Successful Plan Result Display */}
      {planResult && (
        <div className="space-y-5 rounded-xl border border-emerald-500/30 bg-card p-5 shadow-md animate-fade-in">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold text-sm text-foreground">
                Real Gemini Execution Plan Received
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <Badge variant="outline" className="bg-secondary/60">
                Model: {planResult.modelId}
              </Badge>
              {executionLatency !== null && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Latency: {executionLatency} ms
                </Badge>
              )}
              <Badge variant="outline" className="bg-secondary/60">
                Provider: {planResult.providerId.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* 1. Task Understanding */}
          <div className="space-y-1.5 p-3.5 rounded-lg border-l-4 border-l-primary bg-secondary/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span>1. Task Understanding</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {planResult.taskUnderstanding}
            </p>
          </div>

          {/* 2. Suggested Approach */}
          <div className="space-y-1.5 p-3.5 rounded-lg border border-border bg-secondary/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Compass className="h-4 w-4 text-amber-500" />
              <span>2. Suggested Execution Approach</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {planResult.suggestedApproach}
            </p>
          </div>

          {/* 3. Execution Milestones */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <span>3. Execution Milestones ({planResult.suggestedMilestones.length})</span>
            </div>

            <div className="space-y-2">
              {planResult.suggestedMilestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/20 transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
                    {m.order || idx + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {m.title}
                      </h4>
                      {m.isCriticalPath && (
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 shrink-0">
                          Critical Path
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Required Resources */}
          {planResult.requiredResources && planResult.requiredResources.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground block">
                4. Required Resources
              </span>
              <div className="flex flex-wrap gap-1.5">
                {planResult.requiredResources.map((res, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-secondary text-foreground font-mono border border-border"
                  >
                    {res}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. First Actionable Step */}
          <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
              <Flame className="h-4 w-4" />
              <span>5. First Actionable Step (&lt; 15 Minutes)</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {planResult.firstActionableStep}
            </p>
          </div>

          {/* 6. Deliverable Specific Guidance */}
          {planResult.deliverableSpecificGuidance && (
            <div className="p-3.5 rounded-lg border border-border bg-secondary/10 space-y-1">
              <span className="text-[11px] font-semibold text-foreground block">
                Deliverable Specific Guidance ({planResult.providerId}):
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {planResult.deliverableSpecificGuidance}
              </p>
            </div>
          )}

          {/* Raw JSON Inspector Toggle */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>{showRawJson ? 'Hide Raw API JSON' : 'Inspect Raw Gemini Response JSON'}</span>
              {showRawJson ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showRawJson && (
              <pre className="mt-2 p-3 rounded-lg bg-zinc-950 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-72 border border-border">
                {JSON.stringify(planResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
