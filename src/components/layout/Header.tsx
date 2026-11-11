import React from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import { Search, Plus, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { openCreateModal, searchQuery, setSearchQuery, stats } = useDeadlineStore();
  const statistics = stats();

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger */}
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search */}
        <div className="relative w-48 sm:w-72 md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deliverables, projects or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-12 rounded-md border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="absolute right-2 top-2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.2 rounded border border-border">
            <span>⌘K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Execution Engine Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Execution Engine Online</span>
        </div>

        {/* Overdue alert badge if overdue deadlines exist */}
        {statistics.overdue > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
            <span>{statistics.overdue} overdue</span>
          </div>
        )}

        {/* Quick Create CTA */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateModal()}
          className="hidden sm:inline-flex h-8 px-3 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New
        </Button>
      </div>
    </header>
  );
};
