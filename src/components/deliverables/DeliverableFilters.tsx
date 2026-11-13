import React from 'react';
import { Search } from 'lucide-react';

interface DeliverableFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  deadlineFilter: string;
  onDeadlineFilterChange: (val: string) => void;
  sortBy: 'date' | 'title';
  onSortByChange: (val: 'date' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (val: 'asc' | 'desc') => void;
  deadlinesList: { id: string; title: string }[];
}

export const DeliverableFilters: React.FC<DeliverableFiltersProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  deadlineFilter,
  onDeadlineFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  deadlinesList,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-xs text-left">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search deliverables, outputs, repositories, files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filter Selects */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="accepted">Accepted / Verified</option>
          <option value="draft">Draft</option>
          <option value="revision_requested">Revision Requested</option>
        </select>

        {/* Deadline filter */}
        <select
          value={deadlineFilter}
          onChange={(e) => onDeadlineFilterChange(e.target.value)}
          className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[180px] truncate"
        >
          <option value="all">All Projects</option>
          {deadlinesList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as 'date' | 'title')}
          className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="date">Sort: Date</option>
          <option value="title">Sort: Name</option>
        </select>

        {/* Direction toggle */}
        <button
          type="button"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Toggle sort direction"
        >
          {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
        </button>
      </div>
    </div>
  );
};
