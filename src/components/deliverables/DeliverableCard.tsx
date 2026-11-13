import React, { useState } from 'react';
import { VaultDeliverable } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  ExternalLink,
  Copy,
  Check,
  Github,
  Globe,
  UploadCloud,
  FileText,
  ArrowRight,
  FolderGit2,
  FileCheck,
} from 'lucide-react';

interface DeliverableCardProps {
  deliverable: VaultDeliverable;
  onOpenWorkspace: (deadlineId: string) => void;
}

export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  onOpenWorkspace,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUri = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(deliverable.resourceUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormatIcon = () => {
    switch (deliverable.submissionFormat) {
      case 'repository':
        return <Github className="h-4 w-4" />;
      case 'url':
        return <Globe className="h-4 w-4" />;
      case 'file_ref':
        return <UploadCloud className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FolderGit2 className="h-4 w-4" />;
    }
  };

  const isUrl =
    deliverable.resourceUri.startsWith('http://') ||
    deliverable.resourceUri.startsWith('https://');

  const isGitHub =
    deliverable.resourceUri.includes('github.com') ||
    deliverable.submissionFormat === 'repository';

  return (
    <div className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 text-left">
      <div className="space-y-3">
        {/* Category & Status Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              {getFormatIcon()}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              {deliverable.category} • {deliverable.submissionFormat.replace('_', ' ')}
            </span>
          </div>

          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
              deliverable.status === 'accepted'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {deliverable.status === 'accepted' ? 'VERIFIED & ACCEPTED' : deliverable.status.toUpperCase()}
          </span>
        </div>

        {/* Title & Related Deadline */}
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            {deliverable.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Related Project:{' '}
            <button
              type="button"
              onClick={() => onOpenWorkspace(deliverable.deadlineId)}
              className="text-foreground hover:text-primary font-semibold transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              {deliverable.deadlineTitle}
            </button>
          </p>
        </div>

        {/* Resource Reference / Preview Box */}
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/70 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isGitHub ? (
              <Github className="h-4 w-4 text-foreground shrink-0" />
            ) : isUrl ? (
              <Globe className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-mono text-muted-foreground truncate" title={deliverable.resourceUri}>
              {deliverable.resourceUri}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyUri}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              title="Copy resource path or URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {isUrl && (
              <a
                href={deliverable.resourceUri}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 font-semibold"
                title="Open in new window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Summary Excerpt */}
        {deliverable.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {deliverable.summary}
          </p>
        )}

        {/* Verification Notes */}
        {deliverable.verificationNotes && (
          <div className="p-2.5 rounded-lg bg-background border border-border/60 text-[11px] text-muted-foreground space-y-0.5">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <FileCheck className="h-3.5 w-3.5 text-emerald-500" /> Verification Report:
            </span>
            <p>{deliverable.verificationNotes}</p>
          </div>
        )}
      </div>

      {/* Footer Dates & Workspace link */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-[10px] text-muted-foreground font-mono">
          Submitted {formatDate(deliverable.submittedAt)}
        </span>

        <button
          type="button"
          onClick={() => onOpenWorkspace(deliverable.deadlineId)}
          className="text-primary hover:text-orange-600 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Workspace</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
