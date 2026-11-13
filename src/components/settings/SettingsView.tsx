import React, { useState, useEffect } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { AIIntegrationsSettings } from './AIIntegrationsSettings';
import { Button } from '@/components/ui/Button';
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  Database,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  RefreshCw,
  Server,
  User as UserIcon,
  Volume2,
} from 'lucide-react';

export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'ai_integrations'
  | 'environment'
  | 'ide_connections'
  | 'local_bridge'
  | 'data_storage';

export const SettingsView: React.FC = () => {
  const {
    user,
    updateUserPreferences,
    resetToSampleData,
    exportData,
    importData,
    bridgeStatus,
    bridgePort,
    pairingToken,
    detectedIDEs,
    detectInstalledIDEs,
    hostRuntimes,
    fetchHostRuntimes,
    pairBridge,
  } = useDeadlineStore();

  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [tokenInput, setTokenInput] = useState(pairingToken || '');
  const [isPairing, setIsPairing] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  // Fetch host runtimes and IDEs on load
  useEffect(() => {
    fetchHostRuntimes();
    detectInstalledIDEs();
  }, [fetchHostRuntimes, detectInstalledIDEs]);

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    updateUserPreferences(theme);
  };

  const handleExport = async () => {
    const jsonStr = await exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deadline-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleImportSubmit = async () => {
    if (!importJson.trim()) return;
    const ok = await importData(importJson);
    if (ok) {
      setImportStatus('Data successfully imported and active!');
      setImportJson('');
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      setImportStatus('Error importing JSON. Please check formatting.');
    }
  };

  const handleResetData = async () => {
    if (confirm('Reset all deadlines and activities back to realistic sample data?')) {
      await resetToSampleData();
      alert('Sample data restored successfully.');
    }
  };

  const handlePairToken = async () => {
    setIsPairing(true);
    try {
      const ok = await pairBridge(tokenInput.trim());
      if (ok) {
        setPairSuccess(true);
        setTimeout(() => setPairSuccess(false), 3000);
      }
    } finally {
      setIsPairing(false);
    }
  };

  const currentTheme = user?.preferences?.theme || 'dark';

  const sections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: UserIcon },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'ai_integrations', label: 'AI Integrations', icon: Sparkles },
    { id: 'environment', label: 'Development Environment', icon: Cpu },
    { id: 'ide_connections', label: 'IDE Connections', icon: Terminal },
    { id: 'local_bridge', label: 'Local Bridge', icon: Server },
    { id: 'data_storage', label: 'Data & Storage', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings & Preferences
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure application preferences, development toolchains, AI providers, and local execution bridges.
        </p>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 border-t border-border/50 mt-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: General */}
      {activeSection === 'general' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">User Profile</h3>
            <div className="flex items-center gap-4">
              <img
                src={
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'User'}
                className="h-16 w-16 rounded-full object-cover border border-border"
              />
              <div className="space-y-1">
                <span className="font-bold text-sm text-foreground block">
                  {user?.name || 'Jeet Satasiya'}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {user?.email || 'jeet@deadline.local'} • {user?.role || 'Lead Engineer'}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground/80 block">
                  User ID: {user?.id || 'usr_primary'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">Feedback & Audio Chimes</h3>
            <p className="text-xs text-muted-foreground">
              Deadline plays an acoustic milestone chime and deliverable fan-fare when objectives are reached.
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-primary" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Execution Audio Chimes</span>
                  <span className="text-[11px] text-muted-foreground">
                    Web Audio API milestone completions
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Appearance */}
      {activeSection === 'appearance' && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-foreground">Application Theme</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your visual interface appearance preference.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'dark' as const, label: 'Dark Mode', icon: Moon, desc: 'Deep obsidian contrast' },
              { id: 'light' as const, label: 'Light Mode', icon: Sun, desc: 'Clean paper aesthetic' },
              { id: 'system' as const, label: 'System Theme', icon: Laptop, desc: 'Matches OS appearance' },
            ].map((theme) => {
              const Icon = theme.icon;
              const isSelected = currentTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeChange(theme.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-secondary/20 hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">{theme.label}</span>
                    <span className="text-[10px] text-muted-foreground block">{theme.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: AI Integrations */}
      {activeSection === 'ai_integrations' && (
        <div className="space-y-6">
          <AIIntegrationsSettings />
        </div>
      )}

      {/* Section 4: Development Environment */}
      {activeSection === 'environment' && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Local Host Runtimes & Toolchains
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically queried from your machine via the local bridge daemon.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchHostRuntimes()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-scan Runtimes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Node.js', key: 'node', run: hostRuntimes?.node },
              { name: 'npm', key: 'npm', run: hostRuntimes?.npm },
              { name: 'pnpm', key: 'pnpm', run: hostRuntimes?.pnpm },
              { name: 'yarn', key: 'yarn', run: hostRuntimes?.yarn },
              { name: 'Python 3', key: 'python', run: hostRuntimes?.python },
              { name: 'pip', key: 'pip', run: hostRuntimes?.pip },
              { name: 'Git', key: 'git', run: hostRuntimes?.git },
            ].map((tool) => (
              <div
                key={tool.name}
                className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{tool.name}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      tool.run?.isInstalled
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {tool.run?.isInstalled ? 'INSTALLED' : 'NOT DETECTED'}
                  </span>
                </div>
                {tool.run?.isInstalled && (
                  <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                    <span className="block text-foreground font-semibold">
                      Version: {tool.run.version}
                    </span>
                    <span className="block truncate text-[10px]" title={tool.run.path}>
                      {tool.run.path}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: IDE Connections */}
      {activeSection === 'ide_connections' && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Universal IDE & Coding Agent Integrations
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every supported environment is treated as a first-class citizen.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => detectInstalledIDEs()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-detect IDEs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'claude_code', name: 'Anthropic Claude Code', kind: 'Terminal Coding Agent' },
              { id: 'codex', name: 'OpenAI Codex', kind: 'CLI Agent' },
              { id: 'antigravity', name: 'Google Antigravity', kind: 'DeepMind IDE' },
              { id: 'cursor', name: 'Cursor', kind: 'AI Code Editor' },
              { id: 'vscode', name: 'Visual Studio Code', kind: 'Modern IDE' },
              { id: 'windsurf', name: 'Windsurf', kind: 'Agentic IDE' },
            ].map((ide) => {
              const detected = detectedIDEs[ide.id];
              const isInst = detected?.isInstalled;

              return (
                <div
                  key={ide.id}
                  className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {ide.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {ide.kind}
                    </span>
                    {(detected?.binaryPath || detected?.appPath) && (
                      <span className="font-mono text-[10px] text-muted-foreground truncate block max-w-xs">
                        {detected.binaryPath || detected.appPath}
                      </span>
                    )}
                  </div>

                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isInst
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {isInst ? 'READY' : 'AVAILABLE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6: Local Bridge */}
      {activeSection === 'local_bridge' && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Local Execution Bridge</h3>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  bridgeStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {bridgeStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure loopback daemon executing OS-level folder browsing, project scaffolding, and IDE launches.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/40 border border-border/70 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Host Address:</span>
              <span className="font-mono text-muted-foreground">127.0.0.1:{bridgePort}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Security Protocol:</span>
              <span className="font-mono text-muted-foreground">Timing-Safe 256-bit Bearer Token</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Audit Log Path:</span>
              <span className="font-mono text-muted-foreground">~/.deadline/audit.log</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Bridge Pairing Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter 256-bit pairing secret"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handlePairToken}
                disabled={isPairing}
              >
                {isPairing ? 'Pairing...' : 'Save & Verify'}
              </Button>
            </div>
            {pairSuccess && (
              <span className="text-xs text-emerald-500 font-semibold block">
                ✓ Token paired and verified successfully!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Section 7: Data & Storage */}
      {activeSection === 'data_storage' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">Backup & Data Portability</h3>
            <p className="text-xs text-muted-foreground">
              Export all managed deadlines, approved execution plans, milestones, and deliverables to a portable JSON backup file.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                {copiedExport ? 'Exported!' : 'Export JSON Backup'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportArea(!showImportArea)}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Import JSON
              </Button>
            </div>

            {showImportArea && (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="Paste Deadline JSON backup data here..."
                  rows={4}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button variant="primary" size="sm" onClick={handleImportSubmit}>
                  Restore Data
                </Button>
                {importStatus && (
                  <span className="text-xs text-emerald-500 font-semibold block">
                    {importStatus}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-destructive">Restore Sample Demonstration Data</h3>
            <p className="text-xs text-muted-foreground">
              Resets all stored deadlines, milestones, and deliverables back to standard initial demonstration data.
            </p>
            <Button variant="destructive" size="sm" onClick={handleResetData}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Realistic Sample Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
