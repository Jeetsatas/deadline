import React, { useState } from 'react';
import { ToolDefinition } from '../types/ToolTypes';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Download,
  FolderGit2,
  Paperclip,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface ToolWorkspaceShellProps {
  tool: ToolDefinition;
  onBack: () => void;
  outputBlob?: Blob | null;
  outputFilename?: string;
  outputSummary?: string;
  children: React.ReactNode;
}

export const ToolWorkspaceShell: React.FC<ToolWorkspaceShellProps> = ({
  tool,
  onBack,
  outputBlob,
  outputFilename = 'output',
  outputSummary = 'Generated via Deadline Universal Tools Hub',
  children,
}) => {
  const { deadlines, submitFinalDeliverable } = useDeadlineStore();

  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [saveVaultSuccess, setSaveVaultSuccess] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState(deadlines[0]?.id || '');
  const [attachSuccess, setAttachSuccess] = useState(false);

  const Icon = tool.icon;

  const handleDownload = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleSaveToVault = async () => {
    if (!outputBlob) return;
    // Find or fallback to primary deadline
    const targetDeadline = deadlines.find((d) => d.id === selectedDeadlineId) || deadlines[0];
    if (!targetDeadline) {
      alert('Please create at least one deadline to store vault items.');
      return;
    }

    await submitFinalDeliverable(targetDeadline.id, {
      title: outputFilename,
      expectedOutput: targetDeadline.expectedOutput || 'Productivity tool output',
      summary: outputSummary,
      deliverableType: targetDeadline.deliverableType || 'other',
      submissionFormat: 'file_ref',
      resourceUri: `local://${outputFilename}`,
      status: 'accepted',
      fileMetadata: {
        filename: outputFilename,
        filesize: `${(outputBlob.size / 1024).toFixed(1)} KB`,
        filetype: outputBlob.type || 'application/octet-stream',
      },
      verificationNotes: `Processed locally with ${tool.name} in browser memory.`,
    });

    setSaveVaultSuccess(true);
    setTimeout(() => setSaveVaultSuccess(false), 3000);
  };

  const handleAttachToDeadline = async () => {
    if (!outputBlob || !selectedDeadlineId) return;
    await handleSaveToVault();
    setShowAttachModal(false);
    setAttachSuccess(true);
    setTimeout(() => setAttachSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in text-left">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tools Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> 100% Local Browser Processing
          </span>
        </div>
      </div>

      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-6 rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {tool.name}
              </h1>
              {tool.badge && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                  {tool.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>

        {/* Global Output Actions (When outputBlob is present) */}
        {outputBlob && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="primary" size="sm" onClick={handleDownload}>
              {downloadSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-300" /> Downloaded
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download Result
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToVault}
              disabled={saveVaultSuccess}
            >
              {saveVaultSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Saved to Vault
                </>
              ) : (
                <>
                  <FolderGit2 className="h-3.5 w-3.5 mr-1" /> Save to Vault
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttachModal(true)}
              disabled={attachSuccess}
            >
              {attachSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Attached
                </>
              ) : (
                <>
                  <Paperclip className="h-3.5 w-3.5 mr-1" /> Attach
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Main Interactive Tool Body */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
        {children}
      </div>

      {/* Attach to Deadline Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground">
              Attach Output to Deadline
            </h3>
            <p className="text-xs text-muted-foreground">
              Select an existing deadline workspace to link this output as a completed deliverable.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Project</label>
              <select
                value={selectedDeadlineId}
                onChange={(e) => setSelectedDeadlineId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {deadlines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.priority})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAttachModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAttachToDeadline}>
                Confirm & Attach
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
