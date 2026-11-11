import React, { useState, useRef, useEffect } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Menu, ArrowUpRight, X } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    openCreateModal,
    searchQuery,
    setSearchQuery,
    stats,
    deadlines,
    selectDeadline,
  } = useDeadlineStore();

  const statistics = stats();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter deadlines for search popover
  const searchResults = searchQuery.trim()
    ? deadlines
        .filter((d) => {
          const q = searchQuery.toLowerCase();
          return (
            d.title.toLowerCase().includes(q) ||
            d.expectedOutput.toLowerCase().includes(q) ||
            d.tags?.some((t) => t.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];

  // Close search popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectResult = (deadlineId: string) => {
    selectDeadline(deadlineId);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

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

        {/* Global Search Container */}
        <div ref={containerRef} className="relative w-48 sm:w-72 md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deliverables or tags..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full h-8 pl-8 pr-12 rounded-md border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="absolute right-2 top-2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.2 rounded border border-border">
              <span>⌘K</span>
            </div>
          )}

          {/* Instant Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden p-1 text-left">
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/50">
                Matching Deadlines ({searchResults.length})
              </div>

              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching deadlines or deliverables found.
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleSelectResult(res.id)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/70 transition-colors text-left group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {res.title}
                          </span>
                          <Badge priority={res.priority} size="sm">
                            {res.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                          Output: {res.expectedOutput}
                        </p>
                      </div>

                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
