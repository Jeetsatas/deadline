import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  Database,
  Code2,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    updateUserPreferences,
    resetToSampleData,
    exportData,
    importData,
  } = useDeadlineStore();

  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

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

  const currentTheme = user?.preferences?.theme || 'dark';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage application appearance, local persistence, backup and profile preferences.
        </p>
      </div>

      {/* Theme & Appearance */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Theme & Appearance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select your preferred visual style. Optimized for deep contrast in dark mode.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              currentTheme === 'dark'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Moon className="h-4 w-4 mb-1.5" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              currentTheme === 'light'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Sun className="h-4 w-4 mb-1.5" />
            <span>Light</span>
          </button>

          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
              currentTheme === 'system'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Laptop className="h-4 w-4 mb-1.5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Persistence Architecture & Data Management */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Persistence Layer & Storage
          </h3>
        </div>

        <div className="p-3.5 rounded-lg bg-secondary/50 border border-border text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Active Adapter:</span>
            <span className="font-mono text-primary font-semibold">LocalStorageAdapter (v1.0)</span>
          </div>
          <p className="text-muted-foreground">
            All deadlines, execution progress, milestones, and deliverables are persisted safely in your browser storage.
            The modular storage layer allows hot-swapping with Supabase or PostgreSQL in subsequent releases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Data (JSON)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportArea(!showImportArea)}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Data
          </Button>

          <Button variant="ghost" size="sm" onClick={handleResetData} className="text-muted-foreground hover:text-red-500">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to Sample Data
          </Button>
        </div>

        {copiedExport && (
          <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Downloaded JSON export file.
          </p>
        )}

        {showImportArea && (
          <div className="pt-3 space-y-2 border-t border-border">
            <textarea
              rows={4}
              placeholder="Paste exported Deadline JSON data here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 p-2.5 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImportArea(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleImportSubmit}>
                Confirm Import
              </Button>
            </div>
            {importStatus && (
              <p className="text-xs font-medium text-primary mt-1">{importStatus}</p>
            )}
          </div>
        )}
      </div>

      {/* Open-Source Project & License Info */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            About Deadline (Open Source)
          </h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Deadline is an open-source execution platform designed to make deliverables matter more than task activity.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block">Version</span>
            <span className="font-mono font-semibold">0.1.0-alpha</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block">License</span>
            <span className="font-mono font-semibold">MIT License</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block">Copyright</span>
            <span className="font-mono font-semibold">2026 Jeet Satasiya</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block">Repository</span>
            <span className="font-mono font-semibold">Open Source</span>
          </div>
        </div>
      </div>
    </div>
  );
};
