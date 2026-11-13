import React, { useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { DeliverableVaultCategory, VaultDeliverable, DeliverableType, SubmissionFormat } from '@/types';
import { DeliverableCategories } from './DeliverableCategories';
import { DeliverableCard } from './DeliverableCard';
import { DeliverableFilters } from './DeliverableFilters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  FolderGit2,
  ArrowRight,
  ShieldCheck,
  Target,
  Plus,
} from 'lucide-react';

function mapToCategory(type?: DeliverableType, format?: SubmissionFormat): DeliverableVaultCategory {
  if (type === 'software' || type === 'prototype' || format === 'repository') return 'software';
  if (type === 'presentation') return 'presentations';
  if (type === 'report' || type === 'assignment' || type === 'research_paper' || format === 'document') return 'documents';
  if (type === 'design') return 'graphics';
  if (type === 'video') return 'videos';
  if (format === 'url') return 'links';
  return 'other';
}

function resolveResourceType(format?: SubmissionFormat, uri?: string): 'file' | 'url' | 'repository' | 'collection' {
  if (format === 'repository' || (uri && uri.includes('github.com'))) return 'repository';
  if (format === 'url' || (uri && (uri.startsWith('http://') || uri.startsWith('https://')))) return 'url';
  return 'file';
}

export const DeliverableVault: React.FC = () => {
  const { deadlines, selectDeadline, openCreateModal } = useDeadlineStore();

  const [vaultSubTab, setVaultSubTab] = useState<'vault' | 'in-flight'>('vault');
  const [selectedCategory, setSelectedCategory] = useState<DeliverableVaultCategory>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Convert deadline.finalDeliverable items into structured VaultDeliverable items
  const allVaultDeliverables: VaultDeliverable[] = deadlines
    .filter((d) => Boolean(d.finalDeliverable))
    .map((d) => {
      const fd = d.finalDeliverable!;
      const category = mapToCategory(fd.deliverableType || d.deliverableType, fd.submissionFormat);
      const resourceType = resolveResourceType(fd.submissionFormat, fd.resourceUri);

      return {
        id: fd.id,
        deadlineId: d.id,
        deadlineTitle: d.title,
        title: fd.title || `${d.title} Deliverable`,
        expectedOutput: fd.expectedOutput || d.expectedOutput,
        summary: fd.summary,
        category,
        deliverableType: fd.deliverableType || d.deliverableType,
        submissionFormat: fd.submissionFormat,
        resourceUri: fd.resourceUri,
        resourceType,
        status: fd.status || 'submitted',
        submittedAt: fd.submittedAt || d.updatedAt,
        updatedAt: fd.updatedAt || fd.submittedAt || d.updatedAt,
        fileMetadata: fd.fileMetadata,
        verificationNotes: fd.verificationNotes,
      };
    });

  // Calculate category counts
  const categoryCounts: Record<DeliverableVaultCategory, number> = {
    all: allVaultDeliverables.length,
    documents: allVaultDeliverables.filter((d) => d.category === 'documents').length,
    presentations: allVaultDeliverables.filter((d) => d.category === 'presentations').length,
    software: allVaultDeliverables.filter((d) => d.category === 'software').length,
    graphics: allVaultDeliverables.filter((d) => d.category === 'graphics').length,
    videos: allVaultDeliverables.filter((d) => d.category === 'videos').length,
    links: allVaultDeliverables.filter((d) => d.category === 'links').length,
    other: allVaultDeliverables.filter((d) => d.category === 'other').length,
  };

  // Filter vault items
  const filteredVaultItems = allVaultDeliverables.filter((item) => {
    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // Deadline filter
    if (deadlineFilter !== 'all' && item.deadlineId !== deadlineFilter) {
      return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary?.toLowerCase().includes(q);
      const matchUri = item.resourceUri.toLowerCase().includes(q);
      const matchProject = item.deadlineTitle.toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchUri && !matchProject) {
        return false;
      }
    }

    return true;
  });

  // Sort vault items
  filteredVaultItems.sort((a, b) => {
    let cmp: number;
    if (sortBy === 'date') {
      cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    } else {
      cmp = a.title.localeCompare(b.title);
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // In-flight deadlines (pending output)
  const pendingDeadlines = deadlines.filter((d) => !d.finalDeliverable);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Deliverable Vault
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
              {allVaultDeliverables.length} verified outputs
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized library of completed deliverables, code repositories, documents, and verified production outputs.
          </p>
        </div>

        {/* Sub-view switcher */}
        <div className="flex rounded-lg border border-border p-1 bg-secondary/50 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setVaultSubTab('vault')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              vaultSubTab === 'vault'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Delivered Outputs ({allVaultDeliverables.length})
          </button>
          <button
            type="button"
            onClick={() => setVaultSubTab('in-flight')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              vaultSubTab === 'in-flight'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Awaiting Output ({pendingDeadlines.length})
          </button>
        </div>
      </div>

      {vaultSubTab === 'vault' ? (
        <>
          {/* Top Category Navigation Tabs */}
          <DeliverableCategories
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            counts={categoryCounts}
          />

          {/* Filter Bar */}
          <DeliverableFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            deadlineFilter={deadlineFilter}
            onDeadlineFilterChange={setDeadlineFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            deadlinesList={deadlines.map((d) => ({ id: d.id, title: d.title }))}
          />

          {/* Vault Cards Grid */}
          {filteredVaultItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
              <FolderGit2 className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No deliverables found in this view
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search.trim() || statusFilter !== 'all' || deadlineFilter !== 'all' || selectedCategory !== 'all'
                  ? 'Try selecting "All Deliverables" or clearing your filter criteria.'
                  : 'Submit deliverables from any project workspace once tangible output is ready.'}
              </p>
              {pendingDeadlines.length > 0 && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setVaultSubTab('in-flight')}>
                    View {pendingDeadlines.length} In-Flight Projects
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVaultItems.map((item) => (
                <DeliverableCard
                  key={item.id}
                  deliverable={item}
                  onOpenWorkspace={selectDeadline}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* In-Flight / Awaiting Deliverable View */
        <div className="space-y-4">
          {pendingDeadlines.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                All deliverables submitted!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Every project has delivered its target output. Start a new project when you are ready.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
                  <Plus className="h-4 w-4 mr-1.5" /> Plan New Deadline
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeadlines.map((d) => (
                <div
                  key={d.id}
                  onClick={() => selectDeadline(d.id)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer gap-4 text-left"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge priority={d.priority}>{d.priority}</Badge>
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {d.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                        {d.deliverableType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">Target: {d.expectedOutput}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 text-xs">
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold block">
                        Due {formatDate(d.deadlineDate)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.progress}% progress
                      </span>
                    </div>

                    <Button variant="outline" size="sm">
                      Submit Deliverable <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
