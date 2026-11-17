import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { DeadlineCard } from '@/components/deadline/DeadlineCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import { Priority, DeliverableType } from '@/types';
import {
  Search,
  Plus,
  Grid,
  List,
  CalendarRange,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  CalendarClock,
  Target,
  Trash2,
  Edit2,
  ChevronRight,
} from 'lucide-react';

export type DeadlineManagerTab = 'all' | 'active' | 'upcoming' | 'overdue' | 'completed';

interface DeadlineManagerProps {
  initialTab?: DeadlineManagerTab;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ initialTab = 'all' }) => {
  const { deadlines, openCreateModal, selectDeadline, deleteDeadline } = useDeadlineStore();

  const [activeTab, setActiveTab] = useState<DeadlineManagerTab>(initialTab);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DeliverableType>('all');
  const [sortBy, setSortBy] = useState<'dueDateTime' | 'priority' | 'progress' | 'title'>('dueDateTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const nowMs = new Date().getTime();

  // Pre-filter counts for tab pills
  const counts = {
    all: deadlines.length,
    active: deadlines.filter((d) => d.status !== 'completed').length,
    upcoming: deadlines.filter((d) => {
      const diffDays = (new Date(d.dueDateTime).getTime() - nowMs) / (1000 * 60 * 60 * 24);
      return d.status !== 'completed' && diffDays >= 0 && diffDays <= 3;
    }).length,
    overdue: deadlines.filter(
      (d) => d.status !== 'completed' && new Date(d.dueDateTime).getTime() < nowMs
    ).length,
    completed: deadlines.filter((d) => d.status === 'completed').length,
  };

  // Filter deadlines according to selected sub-tab and filters
  const filtered = deadlines.filter((d) => {
    const isCompleted = d.status === 'completed';
    const isOverdue = !isCompleted && new Date(d.dueDateTime).getTime() < nowMs;
    const diffDays = (new Date(d.dueDateTime).getTime() - nowMs) / (1000 * 60 * 60 * 24);

    // Tab filter
    if (activeTab === 'active' && isCompleted) return false;
    if (activeTab === 'upcoming' && (isCompleted || diffDays < 0 || diffDays > 3)) return false;
    if (activeTab === 'overdue' && !isOverdue) return false;
    if (activeTab === 'completed' && !isCompleted) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchOutput = d.expectedOutput.toLowerCase().includes(q);
      const matchDesc = d.description?.toLowerCase().includes(q);
      const matchTags = d.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchOutput && !matchDesc && !matchTags) return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && d.deliverableType !== typeFilter) return false;

    return true;
  });

  // Sort logic
  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'dueDateTime') {
      comparison = new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
    } else if (sortBy === 'progress') {
      comparison = b.progress - a.progress;
    } else if (sortBy === 'priority') {
      const weights: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      comparison = weights[b.priority] - weights[a.priority];
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Deadline Manager
            </h1>
            <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground font-semibold">
              {filtered.length} of {deadlines.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized hub to plan, track, filter, and execute all active commitments and deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4 mr-1.5" /> New Deadline
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Status Tabs */}
      <div className="flex items-center gap-5 overflow-x-auto border-b border-border">
        {[
          { id: 'all' as const, label: 'All Deadlines', count: counts.all, icon: CalendarRange },
          { id: 'active' as const, label: 'Active', count: counts.active, icon: PlayCircle },
          { id: 'upcoming' as const, label: 'Upcoming', count: counts.upcoming, icon: CalendarClock },
          { id: 'overdue' as const, label: 'Overdue', count: counts.overdue, icon: AlertTriangle, danger: counts.overdue > 0 },
          { id: 'completed' as const, label: 'Completed', count: counts.completed, icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'text-foreground border-b-foreground'
                  : 'text-muted-foreground border-b-transparent hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  tab.danger && tab.count > 0
                    ? 'text-rose-500'
                    : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              />
              <span>{tab.label}</span>
              <span
                className={`font-sans text-[10px] px-1.5 py-0.5 font-semibold ${
                  tab.danger && tab.count > 0
                    ? 'bg-rose-500/10 text-rose-500'
                    : isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deliverables, title, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
            className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | DeliverableType)}
            className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Deliverables</option>
            <option value="software">Software</option>
            <option value="prototype">Prototype</option>
            <option value="presentation">Presentation</option>
            <option value="assignment">Assignment</option>
            <option value="research_paper">Research Paper</option>
            <option value="report">Report</option>
            <option value="video">Video</option>
            <option value="design">Design</option>
            <option value="other">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'dueDateTime' | 'priority' | 'progress' | 'title')
            }
            className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="dueDateTime">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Progress</option>
            <option value="title">Sort: Title</option>
          </select>

          {/* Asc / Desc button */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Toggle sort direction"
          >
            {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
          </button>

          {/* Grid vs List View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 ml-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid view"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Deadlines List / Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
          <CalendarRange className="h-8 w-8 text-muted-foreground/60 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">
            No deadlines match your current filters
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search.trim() || priorityFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting filters.'
              : activeTab === 'overdue'
              ? 'Great job! You have no overdue deadlines.'
              : activeTab === 'completed'
              ? 'No deliverables marked as completed yet.'
              : 'Create your first deadline to begin execution tracking.'}
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
              <Plus className="h-4 w-4 mr-1.5" /> Create New Deadline
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <DeadlineCard key={d.id} deadline={d} />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filtered.map((d) => {
            const isCompleted = d.status === 'completed';
            const isOverdue = !isCompleted && new Date(d.dueDateTime).getTime() < nowMs;

            return (
              <div
                key={d.id}
                onClick={() => selectDeadline(d.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/40 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge priority={d.priority}>{d.priority}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {d.title}
                      </span>
                      {d.approvedPlan && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-500 font-bold">
                          AI Plan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Target className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{d.expectedOutput}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-xs">
                  <div className="w-24 hidden md:block">
                    <ProgressBar progress={d.progress} size="sm" />
                  </div>

                  <div className="text-right">
                    <span className={`font-mono text-xs font-semibold block ${isOverdue ? 'text-rose-500' : 'text-foreground'}`}>
                      {formatDate(d.deadlineDate)} {d.deadlineTime}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isCompleted ? 'Delivered' : isOverdue ? 'Overdue' : 'Due date'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(d);
                      }}
                      className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete deadline "${d.title}"?`)) {
                          deleteDeadline(d.id);
                        }
                      }}
                      className="p-1.5 rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
