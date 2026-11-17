import React, { useMemo } from 'react';
import { Activity, ArrowRight, CalendarClock, ShieldAlert } from 'lucide-react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function dueTime(deadline: { dueDateTime: string }): number {
  const timestamp = new Date(deadline.dueDateTime).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

export const CrisisIntelligenceHub: React.FC = () => {
  const { deadlines, selectDeadline } = useDeadlineStore();
  const orderedDeadlines = useMemo(
    () => [...deadlines].sort((left, right) => dueTime(left) - dueTime(right)),
    [deadlines],
  );
  const overdueCount = deadlines.filter((deadline) =>
    deadline.status !== 'completed' && dueTime(deadline) < Date.now(),
  ).length;
  const activeCount = deadlines.filter((deadline) => deadline.status !== 'completed').length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-fade-in">
      <section className="border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Crisis Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Every deadline. One build record.</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open a deadline to review its risk summary, implementation notes, agent conversation, commands, verification results, and reusable build prompt.
            </p>
          </div>
          <div className="grid min-w-56 grid-cols-2 border border-border bg-background">
            <div className="p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{activeCount}</p>
            </div>
            <div className="border-l border-border p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</span>
              <p className={`mt-1 text-2xl font-bold ${overdueCount ? 'text-red-500' : 'text-foreground'}`}>{overdueCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Deadline intelligence</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{deadlines.length} records</span>
        </div>

        {orderedDeadlines.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {orderedDeadlines.map((deadline) => (
              <article key={deadline.id} className="border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge priority={deadline.priority}>{deadline.priority}</Badge>
                      <Badge status={deadline.status}>{deadline.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{deadline.title}</h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {deadline.description || deadline.expectedOutput || 'No additional project details recorded.'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                    <p className="text-xl font-bold text-foreground">{deadline.progress}%</p>
                  </div>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, deadline.progress))}%` }} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Due {deadline.deadlineDate} · {deadline.deadlineTime}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => selectDeadline(deadline.id)}>
                    Open intelligence <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-bold text-foreground">No deadlines to review yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">Create a deadline to start its Crisis Intelligence build record.</p>
          </div>
        )}
      </section>
    </div>
  );
};
