import React, { useEffect, useState } from 'react';
import { useDeadlineStore, NavigationTab } from '@/store/useDeadlineStore';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DeadlineManager } from '@/components/deadline/DeadlineManager';
import { ExecutionEngineView } from '@/components/execution/ExecutionEngineView';
import { PrototypeWorkspaceView } from '@/components/prototype/PrototypeWorkspaceView';
import { DeliverableVault } from '@/components/deliverables/DeliverableVault';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { DeadlineWorkspace } from '@/components/workspace/DeadlineWorkspace';
import { CreateDeadlineModal } from '@/components/deadline/CreateDeadlineModal';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedDeadlineId,
    selectedDeadline,
    selectDeadline,
    loadInitialData,
    isLoading,
    openCreateModal,
    user,
  } = useDeadlineStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deadline_sidebar_collapsed_v1') === 'true';
    }
    return false;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle sidebar collapse with persistence
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('deadline_sidebar_collapsed_v1', String(next));
      }
      return next;
    });
  };

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Synchronize URL hash with route state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) return;

      if (hash.startsWith('deadline/')) {
        const id = hash.replace('deadline/', '');
        if (id) {
          selectDeadline(id);
          return;
        }
      }

      const hashToTab: Record<string, NavigationTab> = {
        dashboard: 'dashboard',
        overview: 'overview',
        deadlines: 'deadlines',
        'my-deadlines': 'my-deadlines',
        upcoming: 'upcoming',
        'in-progress': 'in-progress',
        completed: 'completed',
        'execution-engine': 'execution-engine',
        execution: 'execution-engine',
        'prototype-workspace': 'prototype-workspace',
        prototypes: 'prototype-workspace',
        'deliverable-vault': 'deliverable-vault',
        vault: 'deliverable-vault',
        deliverables: 'deliverable-vault',
        analytics: 'analytics',
        settings: 'settings',
      };

      if (hashToTab[hash]) {
        setActiveTab(hashToTab[hash]);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectDeadline, setActiveTab]);

  // Keep URL hash updated on state change
  useEffect(() => {
    if (selectedDeadlineId) {
      const targetHash = `#/deadline/${selectedDeadlineId}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else {
      const tabToHash: Record<NavigationTab, string> = {
        overview: 'dashboard',
        dashboard: 'dashboard',
        deadlines: 'deadlines',
        'my-deadlines': 'deadlines',
        upcoming: 'deadlines',
        'in-progress': 'deadlines',
        completed: 'deadlines',
        'execution-engine': 'execution-engine',
        execution: 'execution-engine',
        'prototype-workspace': 'prototype-workspace',
        prototypes: 'prototype-workspace',
        'deliverable-vault': 'deliverable-vault',
        deliverables: 'deliverable-vault',
        analytics: 'analytics',
        settings: 'settings',
      };
      const newHash = `#/${tabToHash[activeTab] || 'dashboard'}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }
  }, [activeTab, selectedDeadlineId]);

  // Synchronize theme on startup
  useEffect(() => {
    if (user?.preferences?.theme) {
      const theme = user.preferences.theme;
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    }
  }, [user?.preferences?.theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      // 'N' or Cmd+N for New Deadline
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModal();
      }

      // Cmd+K for Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('header input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openCreateModal]);

  const currentDeadline = selectedDeadlineId ? selectedDeadline() : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Persistent Collapsible Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-64 bg-card h-full shadow-2xl">
            <AppSidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-mono">Initializing Deadline Execution Protocol...</p>
            </div>
          ) : currentDeadline ? (
            <DeadlineWorkspace
              deadline={currentDeadline}
              onBack={() => selectDeadline(null)}
            />
          ) : (
            <>
              {(activeTab === 'overview' || activeTab === 'dashboard') && <Dashboard />}

              {(activeTab === 'deadlines' || activeTab === 'my-deadlines') && (
                <DeadlineManager initialTab="all" />
              )}
              {activeTab === 'upcoming' && <DeadlineManager initialTab="upcoming" />}
              {activeTab === 'in-progress' && <DeadlineManager initialTab="active" />}
              {activeTab === 'completed' && <DeadlineManager initialTab="completed" />}

              {(activeTab === 'execution-engine' || activeTab === 'execution') && (
                <ExecutionEngineView />
              )}

              {(activeTab === 'prototype-workspace' || activeTab === 'prototypes') && (
                <PrototypeWorkspaceView />
              )}

              {(activeTab === 'deliverable-vault' || activeTab === 'deliverables') && (
                <DeliverableVault />
              )}

              {activeTab === 'analytics' && <AnalyticsView />}

              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Global Create / Edit Deadline Modal */}
      <CreateDeadlineModal />
    </div>
  );
};

export default App;
