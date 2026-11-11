import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  ShieldCheck,
  Globe,
  Github,
  UploadCloud,
  FileText,
  ExternalLink,
  Target,
  ArrowRight,
} from 'lucide-react';

export const DeliverablesView: React.FC = () => {
  const { deadlines, selectDeadline } = useDeadlineStore();
  const [tab, setTab] = useState<'submitted' | 'pending'>('submitted');

  const submittedDeadlines = deadlines.filter((d) => Boolean(d.finalDeliverable));
  const pendingDeadlines = deadlines.filter((d) => !d.finalDeliverable);

  const getFormatIcon = (format?: string) => {
    switch (format) {
      case 'repository':
        return <Github className="h-4 w-4" />;
      case 'url':
        return <Globe className="h-4 w-4" />;
      case 'file_ref':
        return <UploadCloud className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Deliverable Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository of completed project outputs, working prototypes, code repositories and documents.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border p-1 bg-secondary/50 text-xs">
          <button
            onClick={() => setTab('submitted')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'submitted'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Delivered Outputs ({submittedDeadlines.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'pending'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Awaiting Output ({pendingDeadlines.length})
          </button>
        </div>
      </div>

      {tab === 'submitted' ? (
        submittedDeadlines.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
            <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-semibold">No deliverables submitted yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Once you finish a prototype, assignment or project, use "Submit Deliverable" in the project workspace.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittedDeadlines.map((d) => {
              const deliv = d.finalDeliverable!;
              return (
                <div
                  key={d.id}
                  className="p-5 rounded-xl border border-border bg-card shadow-sm hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-500">
                          {getFormatIcon(deliv.submissionFormat)}
                        </span>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                          {deliv.submissionFormat}
                        </span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {deliv.status === 'accepted' ? 'Verified & Accepted' : 'Submitted'}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {deliv.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Project: <span className="text-foreground font-medium">{d.title}</span>
                      </p>
                    </div>

                    {/* Deliverable Resource Link */}
                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-muted-foreground font-mono truncate">
                          {deliv.resourceUri}
                        </span>
                      </div>
                      <a
                        href={deliv.resourceUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-orange-600 flex items-center gap-1 shrink-0 font-medium"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Summary */}
                    {deliv.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {deliv.summary}
                      </p>
                    )}

                    {/* Verification Notes */}
                    {deliv.verificationNotes && (
                      <div className="p-2 rounded bg-background border border-border/60 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Verification: </span>
                        {deliv.verificationNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Submitted {formatDate(deliv.submittedAt)}
                    </span>
                    <button
                      onClick={() => selectDeadline(d.id)}
                      className="text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Pending Deliverables */
        pendingDeadlines.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
            <h3 className="text-sm font-semibold">All deliverables submitted!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No pending deliverables in execution.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDeadlines.map((d) => (
              <div
                key={d.id}
                onClick={() => selectDeadline(d.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-all cursor-pointer gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge priority={d.priority}>{d.priority}</Badge>
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {d.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{d.expectedOutput}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-medium block">Due {formatDate(d.deadlineDate)}</span>
                    <span className="text-[10px] text-muted-foreground">{d.progress}% progress</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Open Workspace <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
