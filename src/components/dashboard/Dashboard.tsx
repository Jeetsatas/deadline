import React from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { DeadlineCard } from '@/components/deadline/DeadlineCard';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Plus,
  Flame,
  Activity as ActivityIcon,
  ArrowRight,
  Target,
  Sparkles,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    deadlines,
    activities,
    stats,
    openCreateModal,
    setActiveTab,
    selectDeadline,
  } = useDeadlineStore();

  const statistics = stats();

  // Active work: Currently in-progress, sorted by dueDateTime asc
  const activeDeadlines = deadlines
    .filter((d) => d.status !== 'completed')
    .sort((a, b) => new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime());

  // Top active projects (show first 4)
  const topActive = activeDeadlines.slice(0, 4);

  // Critical / Imminent / Overdue items
  const nowMs = new Date().getTime();
  const criticalItems = activeDeadlines.filter(
    (d) => d.priority === 'critical' || new Date(d.dueDateTime).getTime() < nowMs
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Welcome & Philosophy Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-gradient-to-r from-card via-card to-secondary/30 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Flame className="h-3.5 w-3.5" />
            <span>Execution Protocol Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Work. Build. Deliver.
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            "The output matters more than the activity." Keep moving toward tangible deliverables before time runs out.
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary" size="md" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4 mr-1.5" /> New Deadline
          </Button>
          <Button variant="outline" size="md" onClick={() => setActiveTab('upcoming')}>
            View Upcoming
          </Button>
        </div>
      </div>

      {/* A. Statistics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Deadlines */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Total Deadlines
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {statistics.total}
          </div>
          <span className="text-[10px] text-muted-foreground">All managed projects</span>
        </div>

        {/* Active Deadlines */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Active Work
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-primary">
            {statistics.active}
          </div>
          <span className="text-[10px] text-muted-foreground">In active execution</span>
        </div>

        {/* Due Today */}
        <div
          className={`p-4 rounded-xl border shadow-sm space-y-1 ${
            statistics.dueToday > 0
              ? 'bg-amber-500/5 border-amber-500/30'
              : 'border-border bg-card'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Due Today
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-500">
            {statistics.dueToday}
          </div>
          <span className="text-[10px] text-muted-foreground">Requires immediate focus</span>
        </div>

        {/* Due Tomorrow */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Due Tomorrow
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {statistics.dueTomorrow}
          </div>
          <span className="text-[10px] text-muted-foreground">Preparing deliverable</span>
        </div>

        {/* Overdue */}
        <div
          className={`p-4 rounded-xl border shadow-sm space-y-1 ${
            statistics.overdue > 0
              ? 'bg-red-500/5 border-red-500/30'
              : 'border-border bg-card'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Overdue
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-red-500">
            {statistics.overdue}
          </div>
          <span className="text-[10px] text-muted-foreground">Deliver MVP now</span>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Delivered
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {statistics.completed}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{statistics.deliveryRate}% delivery rate</span>
        </div>
      </div>

      {/* Critical Attention Banner if any */}
      {criticalItems.length > 0 && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {criticalItems.length} High-Risk Deadline{criticalItems.length > 1 ? 's' : ''} Require Immediate Attention
              </h3>
              <p className="text-xs text-muted-foreground">
                Focus on producing the minimum acceptable output to avoid missing target dates.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => selectDeadline(criticalItems[0].id)}
            className="shrink-0 text-xs"
          >
            Execute "{criticalItems[0].title.slice(0, 24)}..."
          </Button>
        </div>
      )}

      {/* C & B. Active Work & Upcoming Deadlines Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Active Execution & Upcoming Deadlines
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('my-deadlines')}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View all ({deadlines.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeDeadlines.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-semibold">All deadlines delivered!</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You have completed all active deliverables. Create a new deadline to start executing on your next milestone.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => openCreateModal()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Deadline
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {topActive.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))}
          </div>
        )}
      </div>

      {/* D & E. Recent Activity & Quick Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">Recent Execution Activity</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Real-time log</span>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No recent activities recorded.</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/60 text-xs"
                >
                  <div className="p-1.5 rounded bg-secondary text-primary shrink-0 mt-0.5">
                    {act.type === 'deliverable_submitted' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : act.type === 'milestone_completed' ? (
                      <Target className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground tracking-tight">{act.title}</p>
                    {act.description && (
                      <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed truncate">
                        {act.description}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch & Philosophy Guide */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">Quick Actions</h3>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Create new deadline</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">⌘N</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('in-progress')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-amber-500" />
                  <span>Continue active work</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{activeDeadlines.length} active</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deliverables')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>View delivered outputs</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{statistics.completed} verified</span>
              </button>
            </div>
          </div>

          {/* Philosophy Card */}
          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
            <span className="font-bold text-primary tracking-wider uppercase text-[10px]">
              Execution First
            </span>
            <p className="font-medium text-foreground leading-relaxed">
              Do not spend days perfecting to-do lists. Build the prototype. Write the draft. Ship the output.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
