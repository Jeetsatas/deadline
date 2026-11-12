import React, { useState, useEffect } from 'react';
import { Deadline } from '@/types';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { ProjectConfigurationResolver } from '@/core/project/ProjectConfigurationResolver';
import { projectTemplateRegistry } from '@/core/project/ProjectTemplateRegistry';
import { ProjectValidationService } from '@/core/project/ProjectValidationService';
import { ideProviderRegistry } from '@/core/ide/IDEProviderRegistry';
import {
  ProjectConfiguration,
  ProjectMode,
  PackageManager,
  ProjectLanguage,
  ProjectInspectionResult,
} from '@/core/project/ProjectTypes';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Folder,
  FolderPlus,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Code2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Copy,
  Check,
  Package,
} from 'lucide-react';

interface PrepareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadline: Deadline;
  onLaunchSuccess?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const PrepareProjectModal: React.FC<PrepareProjectModalProps> = ({
  isOpen,
  onClose,
  deadline,
  onLaunchSuccess,
}) => {
  const {
    bridgeStatus,
    hostRuntimes,
    detectedIDEs,
    selectedIDEProviderId,
    selectedProjectPath,
    environmentReports,
    initializationProgressEvents,
    fetchHostRuntimes,
    pickNativeFolder,
    inspectProjectDirectory,
    saveProjectConfiguration,
    initializeProjectEnvironment,
    verifyProjectEnvironment,
    setSelectedIDEProvider,
    setSelectedProjectPath,
    startIDESession,
  } = useDeadlineStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [copiedPath, setCopiedPath] = useState(false);

  // Step 1: Location State
  const [projectMode, setProjectMode] = useState<ProjectMode>('new');
  const [parentDir, setParentDir] = useState<string>('/Users/apple/Desktop');
  const [folderName, setFolderName] = useState<string>(
    deadline.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '-') || 'Calculator-App'
  );
  const [existingPath, setExistingPath] = useState<string>(selectedProjectPath || '/Users/apple/Desktop');
  const [inspectionResult, setInspectionResult] = useState<ProjectInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Step 2: Configuration State
  const [config, setConfig] = useState<ProjectConfiguration>(() =>
    ProjectConfigurationResolver.resolveRecommendedConfiguration(deadline, hostRuntimes || undefined)
  );

  // Step 3 & 4: Initialization & Verification State
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installOutput, setInstallOutput] = useState<string>('');

  // Step 7: Launching State
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');

  const templates = projectTemplateRegistry.listTemplates();
  const allIDEProviders = ideProviderRegistry.listProviders();
  const activeEvents = initializationProgressEvents[deadline.id] || [];
  const currentEnvReport = environmentReports[deadline.id];

  // Initial runtime detection on mount
  useEffect(() => {
    if (isOpen) {
      fetchHostRuntimes();
      // Pre-populate recommended configuration
      const recommended = ProjectConfigurationResolver.resolveRecommendedConfiguration(
        deadline,
        hostRuntimes || undefined,
        parentDir
      );
      setConfig(recommended);
    }
  }, [isOpen, deadline, fetchHostRuntimes, parentDir, hostRuntimes]);

  // Destination path preview
  const destinationPath =
    projectMode === 'new'
      ? `${parentDir.replace(/\/+$/, '')}/${folderName.trim()}`
      : existingPath;

  // Sync destination path to config
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      mode: projectMode,
      projectName: folderName.trim(),
      parentDirectory: parentDir,
      projectPath: destinationPath,
    }));
  }, [projectMode, folderName, parentDir, destinationPath]);

  if (!isOpen) return null;

  // Handle Native Browse for Parent or Existing Directory
  const handleBrowseFolder = async (mode: 'parent' | 'existing') => {
    setIsPicking(true);
    setLocationError(null);
    try {
      const prompt =
        mode === 'parent'
          ? 'Select Parent Directory for New Project'
          : 'Select Existing Project Directory';
      const starting = mode === 'parent' ? parentDir : existingPath;

      const res = await pickNativeFolder(prompt, starting);
      if (res.success && res.path) {
        if (mode === 'parent') {
          setParentDir(res.path);
        } else {
          setExistingPath(res.path);
          handleInspectExisting(res.path);
        }
      } else if (!res.cancelled && res.error) {
        setLocationError(res.error);
      }
    } catch (e) {
      setLocationError((e as Error).message);
    } finally {
      setIsPicking(false);
    }
  };

  // Inspect existing directory
  const handleInspectExisting = async (path: string) => {
    setIsInspecting(true);
    setLocationError(null);
    try {
      const inspection = await inspectProjectDirectory(path);
      setInspectionResult(inspection);
      if (inspection.hasPackageJson || inspection.hasRequirementsTxt) {
        // Adapt config to existing project
        setConfig((prev) => ({
          ...prev,
          mode: 'existing',
          projectPath: path,
          projectName: inspection.packageJson?.name || path.split('/').pop() || 'Existing-Project',
          projectType: inspection.detectedFramework === 'react' ? 'react-vite-ts' : 'custom',
          language: inspection.detectedLanguage,
          packageManager: inspection.detectedPackageManager,
        }));
      }
    } catch (e) {
      setLocationError((e as Error).message);
    } finally {
      setIsInspecting(false);
    }
  };

  // Validate step 1 before proceeding
  const handleProceedFromLocation = () => {
    setLocationError(null);
    if (projectMode === 'new') {
      const val = ProjectValidationService.validateDestinationPath(parentDir, folderName);
      if (!val.valid) {
        setLocationError(val.error || 'Invalid project location');
        return;
      }
    } else {
      if (!existingPath.trim()) {
        setLocationError('Please specify an existing project directory path.');
        return;
      }
    }

    saveProjectConfiguration(deadline.id, config);
    setSelectedProjectPath(destinationPath);
    setCurrentStep(2);
  };

  // Handle Step 3: Run Project Initialization
  const handleExecuteInitialization = async () => {
    setIsInitializing(true);
    setInstallError(null);
    try {
      await initializeProjectEnvironment(deadline.id, config);
      setCurrentStep(4);
    } catch (err) {
      setInstallError((err as Error).message || 'Initialization failed.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle Step 4: Run Dependency Install
  const handleInstallDependencies = async () => {
    setIsInstallingDeps(true);
    setInstallError(null);
    setInstallOutput('');
    try {
      const res = await fetch(`http://127.0.0.1:4488/project/install-dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('deadline_bridge_token') || ''}`,
        },
        body: JSON.stringify({
          projectPath: destinationPath,
          packageManager: config.packageManager,
          packages: config.customDependencies,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInstallOutput(data.stdout || 'Dependencies installed successfully.');
        await verifyProjectEnvironment(deadline.id, destinationPath);
      } else {
        setInstallError(data.error || 'Dependency installation failed.');
        setInstallOutput(data.stderr || data.stdout || '');
      }
    } catch (e) {
      setInstallError((e as Error).message);
    } finally {
      setIsInstallingDeps(false);
    }
  };

  // Handle Step 7: Launch IDE
  const handleLaunchIDE = async () => {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      await startIDESession(deadline.id, customInstructions.trim() || undefined);
      if (onLaunchSuccess) onLaunchSuccess();
      onClose();
    } catch (err) {
      setLaunchError((err as Error).message || 'Failed to launch development environment.');
    } finally {
      setIsLaunching(false);
    }
  };

  const selectedProvider = ideProviderRegistry.getProvider(selectedIDEProviderId);
  const selectedDetection = detectedIDEs[selectedIDEProviderId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-left overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-secondary/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                PREPARE YOUR PROJECT
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Stage {currentStep} of 7
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>{deadline.title}</span>
              {deadline.approvedPlan && (
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  Plan v{deadline.approvedPlan.version} Approved
                </Badge>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Navigation Pills */}
        <div className="px-5 py-3 border-b border-border/80 bg-background flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
          {[
            { step: 1, label: 'Location' },
            { step: 2, label: 'Configure' },
            { step: 3, label: 'Initialize' },
            { step: 4, label: 'Verify' },
            { step: 5, label: 'Select IDE' },
            { step: 6, label: 'Review' },
            { step: 7, label: 'Launch' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                // Allow navigating back or forward if already initialized
                if (item.step < currentStep || currentStep >= 4) {
                  setCurrentStep(item.step as WizardStep);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                currentStep === item.step
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : item.step < currentStep
                  ? 'bg-secondary text-foreground hover:bg-secondary/80'
                  : 'text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="text-[10px] opacity-80">{item.step}.</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* ==================================================== */}
          {/* STAGE 1: PROJECT LOCATION */}
          {/* ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" />
                  1. Select Project Location
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Choose whether to initialize a fresh project directory or connect to an existing local folder.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setProjectMode('new')}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    projectMode === 'new'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-secondary/30'
                  }`}
                >
                  <FolderPlus className={`h-5 w-5 ${projectMode === 'new' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <span className="font-bold text-foreground block">Create New Project</span>
                    <span className="text-[11px] text-muted-foreground">Scaffold new folder & files</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProjectMode('existing')}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    projectMode === 'existing'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-secondary/30'
                  }`}
                >
                  <Folder className={`h-5 w-5 ${projectMode === 'existing' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <span className="font-bold text-foreground block">Use Existing Project</span>
                    <span className="text-[11px] text-muted-foreground">Connect existing repository</span>
                  </div>
                </button>
              </div>

              {/* New Project Form */}
              {projectMode === 'new' ? (
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Parent Directory:</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Native macOS Finder Picker</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={parentDir}
                        onChange={(e) => setParentDir(e.target.value)}
                        placeholder="/Users/username/Desktop/Projects"
                        className="flex-1 h-9 px-3 rounded-lg border border-input bg-background font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleBrowseFolder('parent')}
                        isLoading={isPicking}
                        className="cursor-pointer shrink-0"
                      >
                        <Folder className="h-3.5 w-3.5 mr-1.5" />
                        Browse...
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      New Project Folder Name:
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Calculator-App"
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background font-mono text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block font-mono">FINAL DESTINATION PATH</span>
                      <span className="font-mono text-foreground font-semibold truncate block">
                        {destinationPath}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(destinationPath);
                        setCopiedPath(true);
                        setTimeout(() => setCopiedPath(false), 2000);
                      }}
                      className="shrink-0 text-xs"
                    >
                      {copiedPath ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Existing Project Form */
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Existing Project Path:</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Native macOS Finder Picker</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={existingPath}
                        onChange={(e) => {
                          setExistingPath(e.target.value);
                          setInspectionResult(null);
                        }}
                        placeholder="/Users/username/Desktop/my-existing-app"
                        className="flex-1 h-9 px-3 rounded-lg border border-input bg-background font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleBrowseFolder('existing')}
                        isLoading={isPicking}
                        className="cursor-pointer shrink-0"
                      >
                        <Folder className="h-3.5 w-3.5 mr-1.5" />
                        Browse...
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectExisting(existingPath)}
                        isLoading={isInspecting}
                        className="cursor-pointer shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Inspect
                      </Button>
                    </div>
                  </div>

                  {/* Inspection Report */}
                  {inspectionResult && (
                    <div className="p-3.5 rounded-lg bg-background border border-border space-y-2">
                      <span className="text-[11px] font-bold text-foreground block">
                        Existing Project Inspection Report:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded bg-secondary/40">
                          <span className="text-muted-foreground block text-[10px]">GIT REPO</span>
                          <span className="font-semibold">{inspectionResult.isGitRepo ? 'Yes (.git)' : 'No'}</span>
                        </div>
                        <div className="p-2 rounded bg-secondary/40">
                          <span className="text-muted-foreground block text-[10px]">MANIFEST</span>
                          <span className="font-semibold">
                            {inspectionResult.hasPackageJson ? 'package.json' : inspectionResult.hasRequirementsTxt ? 'requirements.txt' : 'None'}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-secondary/40">
                          <span className="text-muted-foreground block text-[10px]">FRAMEWORK</span>
                          <span className="font-semibold uppercase">{inspectionResult.detectedFramework}</span>
                        </div>
                        <div className="p-2 rounded bg-secondary/40">
                          <span className="text-muted-foreground block text-[10px]">LANGUAGE</span>
                          <span className="font-semibold uppercase">{inspectionResult.detectedLanguage}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {locationError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleProceedFromLocation}>
                  Continue to Configuration
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 2: PROJECT CONFIGURATION */}
          {/* ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  2. Project Configuration & Technology Stack
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Driven by your approved execution plan and requirements. You have full freedom to customize every parameter.
                </p>
              </div>

              {/* Recommendation Callout */}
              {config.recommendationReason && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">AI Plan Recommendation</span>
                    <p className="text-muted-foreground">{config.recommendationReason}</p>
                  </div>
                </div>
              )}

              {/* Template Selection Grid */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground block">
                  Select Project Template / Application Architecture:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          projectType: tpl.id,
                          language: tpl.language,
                          packageManager: tpl.defaultPackageManager,
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        config.projectType === tpl.id
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">{tpl.displayName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {tpl.language}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language & Package Manager Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Programming Language:</label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value as ProjectLanguage })}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background font-mono text-xs cursor-pointer"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html-css">HTML & CSS (Static)</option>
                    <option value="other">Other / Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Package Manager:</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Host: npm {hostRuntimes?.npm?.isInstalled ? '✓' : '✗'}, pip {hostRuntimes?.pip?.isInstalled ? '✓' : '✗'}
                    </span>
                  </label>
                  <select
                    value={config.packageManager}
                    onChange={(e) => setConfig({ ...config, packageManager: e.target.value as PackageManager })}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background font-mono text-xs cursor-pointer"
                  >
                    <option value="npm">npm {hostRuntimes?.npm?.isInstalled ? '(Available)' : '(Not Installed)'}</option>
                    <option value="pnpm">pnpm {hostRuntimes?.pnpm?.isInstalled ? '(Available)' : '(Not Installed)'}</option>
                    <option value="yarn">yarn {hostRuntimes?.yarn?.isInstalled ? '(Available)' : '(Not Installed)'}</option>
                    <option value="pip">pip {hostRuntimes?.pip?.isInstalled ? '(Available)' : '(Not Installed)'}</option>
                    <option value="none">None (Zero external dependencies)</option>
                  </select>
                </div>
              </div>

              {/* Git Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.initGit}
                  onChange={(e) => setConfig({ ...config, initGit: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-foreground block">Initialize Git Repository</span>
                  <span className="text-[11px] text-muted-foreground">Run `git init` and generate canonical .gitignore</span>
                </div>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setCurrentStep(3)}>
                  Review Initialization
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 3: INITIALIZATION REVIEW & PROGRESS */}
          {/* ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  3. Project Initialization Review
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Review the exact filesystem actions Deadline will perform. Nothing will be executed without your confirmation.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PROJECT</span>
                    <span className="font-semibold text-foreground">{config.projectName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">TEMPLATE</span>
                    <span className="font-semibold text-foreground">{config.projectType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PACKAGE MANAGER</span>
                    <span className="font-semibold text-foreground">{config.packageManager}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-mono">DESTINATION PATH</span>
                  <span className="font-mono text-foreground font-semibold">{destinationPath}</span>
                </div>
              </div>

              {/* Actions Checklist */}
              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                <span className="font-bold text-foreground block text-xs">Initialization Checklist:</span>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Create dedicated project directory `{config.projectName}`</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Generate starter files & structure for `{config.projectType}`</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Configure package manifest ({config.packageManager === 'pip' ? 'requirements.txt' : 'package.json'})</span>
                  </li>
                  {config.initGit && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Initialize Git repository and write `.gitignore`</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Live Event Output Log */}
              {activeEvents.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-muted-foreground block text-[11px]">Progress Log:</span>
                  <div className="p-3 rounded-lg bg-black/40 border border-border font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto text-emerald-400">
                    {activeEvents.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground text-[10px]">
                          [{new Date(ev.timestamp).toLocaleTimeString()}]
                        </span>
                        <span>{ev.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {installError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{installError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleExecuteInitialization}
                  isLoading={isInitializing}
                  className="font-semibold shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  Initialize Project Structure
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 4: ENVIRONMENT & DEPENDENCY VERIFICATION */}
          {/* ==================================================== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  4. Dependency Installation & Environment Verification
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Install required packages and verify your project build before connecting your coding environment.
                </p>
              </div>

              {/* Dependency Action Card */}
              {config.packageManager !== 'none' && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block">Install Approved Dependencies</span>
                      <p className="text-[11px] text-muted-foreground">
                        Command: <code className="bg-secondary px-1.5 py-0.5 rounded font-mono">{config.packageManager} install</code> in {destinationPath}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleInstallDependencies}
                      isLoading={isInstallingDeps}
                      className="cursor-pointer font-semibold shadow-sm"
                    >
                      <Package className="h-3.5 w-3.5 mr-1.5" />
                      Run {config.packageManager} install
                    </Button>
                  </div>

                  {installOutput && (
                    <div className="p-3 rounded-lg bg-black/40 border border-border font-mono text-[11px] max-h-36 overflow-y-auto text-muted-foreground whitespace-pre-wrap">
                      {installOutput}
                    </div>
                  )}
                </div>
              )}

              {/* Verification Report */}
              {currentEnvReport && (
                <div className={`p-4 rounded-xl border space-y-2.5 ${
                  currentEnvReport.isReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${currentEnvReport.isReady ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <span className="font-bold text-foreground">
                      {currentEnvReport.isReady ? 'Environment Verified & Production Ready' : 'Environment Partially Ready'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-background/60">
                      <span className="text-muted-foreground block text-[10px]">DIRECTORY</span>
                      <span>{currentEnvReport.directoryExists ? 'Verified ✓' : 'Missing ✗'}</span>
                    </div>
                    <div className="p-2 rounded bg-background/60">
                      <span className="text-muted-foreground block text-[10px]">MANIFEST</span>
                      <span>{currentEnvReport.manifestExists ? 'Verified ✓' : 'Missing ✗'}</span>
                    </div>
                    <div className="p-2 rounded bg-background/60">
                      <span className="text-muted-foreground block text-[10px]">DEPENDENCIES</span>
                      <span>{currentEnvReport.dependenciesInstalled ? 'Installed ✓' : 'Pending ✗'}</span>
                    </div>
                    <div className="p-2 rounded bg-background/60">
                      <span className="text-muted-foreground block text-[10px]">GIT</span>
                      <span>{currentEnvReport.gitInitialized ? 'Active ✓' : 'No'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setCurrentStep(5)}>
                  Choose IDE
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 5: UNIVERSAL IDE SELECTION */}
          {/* ==================================================== */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  5. Choose Your Preferred Development Environment
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Your project is initialized independently of the IDE. You can execute this deadline in any supported tool.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allIDEProviders.map((provider) => {
                  const isSelected = selectedIDEProviderId === provider.id;
                  const detection = detectedIDEs[provider.id];
                  const isInstalled = Boolean(detection?.isInstalled);

                  return (
                    <div
                      key={provider.id}
                      onClick={() => setSelectedIDEProvider(provider.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-foreground">{provider.metadata.displayName}</span>
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
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground mb-2">
                        {provider.metadata.badgeLabel}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {provider.metadata.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(4)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setCurrentStep(6)}>
                  Review Execution
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 6: EXECUTION REVIEW */}
          {/* ==================================================== */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  6. Execution Review & Final Confirmation
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Confirm the project configuration and target environment before starting live development.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/80">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PROJECT LOCATION</span>
                    <span className="font-semibold text-foreground truncate block">{destinationPath}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">TARGET ENVIRONMENT</span>
                    <span className="font-semibold text-foreground">
                      {selectedProvider?.metadata.displayName} ({selectedDetection?.isInstalled ? 'Ready' : 'Not Installed'})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">FRAMEWORK</span>
                    <span className="font-semibold text-foreground">{config.projectType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">LANGUAGE</span>
                    <span className="font-semibold text-foreground">{config.language}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PACKAGE MANAGER</span>
                    <span className="font-semibold text-foreground">{config.packageManager}</span>
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground block">
                  Custom Task Instructions for Coding Agent (Optional):
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Focus on Milestone 1 first. Write full unit tests using Vitest."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(5)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setCurrentStep(7)}>
                  Continue to Launch
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STAGE 7: START WORKING */}
          {/* ==================================================== */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="max-w-md mx-auto space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Your project is ready. Start building.
                </h3>
                <p className="text-muted-foreground">
                  Deadline will write the canonical <code className="text-foreground font-mono font-semibold">DEADLINE_CONTEXT.md</code> into your project and launch {selectedProvider?.metadata.displayName}.
                </p>
              </div>

              {selectedProvider && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 max-w-md mx-auto text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{selectedProvider.metadata.displayName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                      {selectedDetection?.isInstalled ? 'Ready' : 'Setup Required'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Action: <span className="font-semibold text-foreground">{selectedProvider.metadata.primaryActionLabel}</span>
                  </p>
                </div>
              )}

              {launchError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-500 flex items-center gap-2 max-w-md mx-auto">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{launchError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Review Configuration
                </Button>
                {selectedDetection?.isInstalled ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleLaunchIDE}
                    isLoading={isLaunching}
                    disabled={isLaunching || bridgeStatus !== 'connected'}
                    className="font-bold shadow-md cursor-pointer"
                  >
                    <Play className="h-4 w-4 mr-1.5 fill-current" />
                    {selectedProvider?.metadata.primaryActionLabel || 'Start Working'}
                  </Button>
                ) : (
                  <a
                    href={selectedProvider?.metadata.installGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Install {selectedProvider?.metadata.displayName}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
