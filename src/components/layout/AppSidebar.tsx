import React from 'react';
import { useDeadlineStore, NavigationTab } from '@/store/useDeadlineStore';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  CalendarRange,
  Cpu,
  Box,
  FolderGit2,
  Wrench,
  BarChart3,
  ShieldAlert,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

interface NavItemDef {
  id: NavigationTab;
  aliasMatch: NavigationTab[];
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  className = '',
}) => {
  const {
    activeTab,
    setActiveTab,
    openCreateModal,
    deadlines,
    stats,
    user,
    updateUserPreferences,
    activeExecutionSessions,
  } = useDeadlineStore();

  const statistics = stats();

  // Metrics for badges
  const planCount = deadlines.filter((d) => Boolean(d.approvedPlan)).length;
  const activeSessionCount = Object.values(activeExecutionSessions).filter(
    (s) => s.status === 'running' || s.status === 'launched' || s.status === 'externally_managed'
  ).length;
  const executionBadge = activeSessionCount > 0 ? `${activeSessionCount} active` : planCount > 0 ? planCount : undefined;

  const prototypeCount = deadlines.filter(
    (d) => d.executionApproach === 'prototype_first' || d.deliverableType === 'prototype'
  ).length;

  const deliverablesCount = deadlines.filter((d) => Boolean(d.finalDeliverable)).length;

  const workspaceNavItems: NavItemDef[] = [
    {
      id: 'dashboard',
      aliasMatch: ['dashboard', 'overview'],
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: statistics.active > 0 ? statistics.active : undefined,
    },
    {
      id: 'crisis-intelligence',
      aliasMatch: ['crisis-intelligence'],
      label: 'Crisis Intelligence',
      icon: ShieldAlert,
      badge: deadlines.length > 0 ? deadlines.length : undefined,
    },
    {
      id: 'deadlines',
      aliasMatch: ['deadlines', 'my-deadlines', 'upcoming', 'in-progress', 'completed'],
      label: 'Deadline Manager',
      icon: CalendarRange,
      badge: statistics.total,
    },
    {
      id: 'execution-engine',
      aliasMatch: ['execution-engine', 'execution'],
      label: 'Execution Engine',
      icon: Cpu,
      badge: executionBadge,
    },
    {
      id: 'prototype-workspace',
      aliasMatch: ['prototype-workspace', 'prototypes'],
      label: 'Prototype Workspace',
      icon: Box,
      badge: prototypeCount > 0 ? prototypeCount : undefined,
    },
    {
      id: 'deliverable-vault',
      aliasMatch: ['deliverable-vault', 'deliverables'],
      label: 'Deliverable Vault',
      icon: FolderGit2,
      badge: deliverablesCount > 0 ? deliverablesCount : undefined,
    },
    {
      id: 'tools',
      aliasMatch: ['tools'],
      label: 'Tools',
      icon: Wrench,
      badge: '30',
    },
    {
      id: 'analytics',
      aliasMatch: ['analytics'],
      label: 'Analytics',
      icon: BarChart3,
    },
  ];

  const preferenceNavItems: NavItemDef[] = [
    {
      id: 'settings',
      aliasMatch: ['settings'],
      label: 'Settings',
      icon: Settings,
    },
  ];

  const currentTheme = user?.preferences?.theme || 'light';

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateUserPreferences(nextTheme);
  };

  const isItemActive = (item: NavItemDef) => {
    return item.aliasMatch.includes(activeTab);
  };

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-border bg-card transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* Top Section */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header & Toggle */}
        <div className="flex items-center justify-between h-16 px-3.5 border-b border-border shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 bg-primary flex items-center justify-center text-white shrink-0">
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
              <div className="min-w-0 text-left">
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
              <div
                className="h-8 w-8 bg-primary flex items-center justify-center text-white cursor-pointer"
                onClick={onToggleCollapse}
                title="Expand Sidebar"
              >
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

          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Action: New Deadline CTA */}
        <div className="p-3 shrink-0">
          <Button
            variant="primary"
            onClick={() => openCreateModal()}
            className={`w-full justify-center shadow-none font-semibold transition-colors ${
              isCollapsed ? 'px-0 h-11' : 'h-11 px-3 text-sm'
            }`}
            title="Create Deadline (N)"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="ml-1.5">New Deadline</span>}
          </Button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-1">
          {/* Group 1: WORKSPACE */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                Workspace
              </div>
            ) : (
              <div className="h-2" />
            )}

            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}` : undefined}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 border-l-2 text-sm font-medium transition-colors group cursor-pointer relative ${
                    active
                      ? 'bg-primary/5 text-primary font-semibold border-l-primary border-y-transparent border-r-transparent'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground border-transparent'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed dot indicator when active */}
                  {isCollapsed && active && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 2: PREFERENCES */}
          <div className="space-y-1 pt-2 border-t border-border/50">
            {!isCollapsed ? (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                Preferences
              </div>
            ) : (
              <div className="h-2" />
            )}

            {preferenceNavItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 border-l-2 text-sm font-medium transition-colors group cursor-pointer relative ${
                    active
                      ? 'bg-primary/5 text-primary font-semibold border-l-primary border-y-transparent border-r-transparent'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground border-transparent'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}

                  {isCollapsed && active && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer: User Profile & Controls */}
      <div className="p-3 border-t border-border/80 space-y-2 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
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

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 cursor-pointer"
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
              src={
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={user?.name || 'User'}
              className="h-7 w-7 rounded-full object-cover border border-border"
              title={user?.name || 'Jeet Satasiya'}
            />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-zinc-600" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
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
