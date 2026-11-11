import React from 'react';
import { useDeadlineStore, NavigationTab } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  Layers,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const {
    activeTab,
    setActiveTab,
    openCreateModal,
    stats,
    user,
    updateUserPreferences,
  } = useDeadlineStore();

  const statistics = stats();

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'my-deadlines', label: 'My Deadlines', icon: Layers, badge: statistics.total },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, badge: statistics.dueToday + statistics.dueTomorrow },
    { id: 'in-progress', label: 'In Progress', icon: PlayCircle, badge: statistics.active },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, badge: statistics.completed },
    { id: 'deliverables', label: 'Deliverables', icon: ShieldCheck, badge: statistics.completed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentTheme = user?.preferences?.theme || 'dark';

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateUserPreferences(nextTheme);
  };

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-border bg-card transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header: Brand & Collapse Toggle */}
      <div>
        <div className="flex items-center justify-between h-14 px-3.5 border-b border-border/80">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Brand Logo Glyph */}
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm tracking-tight text-foreground block truncate">
                  Deadline
                </span>
                <span className="text-[10px] text-muted-foreground font-mono block -mt-0.5 tracking-tight truncate">
                  Work. Build. Deliver.
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            aria-label="Toggle sidebar collapse"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Action: New Deadline CTA */}
        <div className="p-3">
          <Button
            variant="primary"
            onClick={() => openCreateModal()}
            className={`w-full justify-center shadow-sm font-semibold transition-all ${
              isCollapsed ? 'px-0 h-9' : 'h-9 px-3 text-xs'
            }`}
            title="Create Deadline (N)"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="ml-1.5">New Deadline</span>}
          </Button>
        </div>

        {/* Navigation Items List */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-secondary text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />

                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer: User Profile, Theme Toggle & Collapse Toggle */}
      <div className="p-3 border-t border-border/80 space-y-2">
        {/* User Profile Info */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="h-7 w-7 rounded-full object-cover border border-border shrink-0"
              />
              <div className="min-w-0 text-left">
                <span className="block text-xs font-semibold text-foreground truncate">
                  {user?.name || 'Jeet Satasiya'}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {user?.role || 'Lead Engineer'}
                </span>
              </div>
            </div>

            {/* Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-zinc-600" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="h-7 w-7 rounded-full object-cover border border-border"
              title={user?.name || 'Jeet Satasiya'}
            />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Toggle Theme"
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-zinc-600" />
              )}
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
