import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { DeadlineCard } from '@/components/deadline/DeadlineCard';
import { Button } from '@/components/ui/Button';
import { Priority, DeliverableType, DeadlineStatus } from '@/types';
import {
  Search,
  Plus,
  Grid,
  List,
  Clock,
} from 'lucide-react';

interface MyDeadlinesViewProps {
  filterStatus?: 'all' | 'in_progress' | 'upcoming' | 'completed';
  title?: string;
}

export const MyDeadlinesView: React.FC<MyDeadlinesViewProps> = ({
  filterStatus = 'all',
  title = 'My Deadlines',
}) => {
  const { deadlines, openCreateModal } = useDeadlineStore();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DeliverableType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeadlineStatus | 'upcoming'>(
    filterStatus === 'upcoming' ? 'upcoming' : filterStatus === 'in_progress' ? 'in_progress' : filterStatus === 'completed' ? 'completed' : 'all'
  );
  const [sortBy, setSortBy] = useState<'dueDateTime' | 'priority' | 'progress'>('dueDateTime');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');


  // Filter deadlines
  const filtered = deadlines.filter((d) => {
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchOutput = d.expectedOutput.toLowerCase().includes(q);
      const matchTags = d.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchOutput && !matchTags) return false;
    }

    // Status filter
    if (statusFilter === 'upcoming') {
      if (d.status === 'completed') return false;
    } else if (statusFilter !== 'all') {
      if (d.status !== statusFilter) return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && d.deliverableType !== typeFilter) return false;

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'dueDateTime') {
      return new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
    }
    if (sortBy === 'progress') {
      return b.progress - a.progress;
    }
    if (sortBy === 'priority') {
      const weights: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return weights[b.priority] - weights[a.priority];
    }
    return 0;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage projects, monitor target deliverables and track execution milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4 mr-1.5" /> New Deadline
          </Button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deadlines, outputs, or #tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming & Active</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed / Delivered</option>
          </select>

          {/* Priority select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Categories</option>
            <option value="prototype">Prototype</option>
            <option value="software">Software</option>
            <option value="presentation">Presentation</option>
            <option value="research_paper">Research Paper</option>
            <option value="assignment">Assignment</option>
            <option value="report">Report</option>
            <option value="video">Video</option>
            <option value="design">Design</option>
          </select>

          {/* Sort select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="dueDateTime">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Progress</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-md border border-input p-0.5 bg-background/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
              aria-label="Grid view"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Deadlines Feed */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-semibold">No deadlines found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search criteria or create a new deadline.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setTypeFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deadline) => (
            <DeadlineCard key={deadline.id} deadline={deadline} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((deadline) => (
            <DeadlineCard key={deadline.id} deadline={deadline} variant="compact" />
          ))}
        </div>
      )}
    </div>
  );
};
