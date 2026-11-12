import React, { useEffect, useState } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { MyDeadlinesView } from '@/components/deadline/MyDeadlinesView';
import { DeadlineWorkspace } from '@/components/workspace/DeadlineWorkspace';
import { DeliverablesView } from '@/components/deliverables/DeliverablesView';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { CreateDeadlineModal } from '@/components/deadline/CreateDeadlineModal';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    selectedDeadlineId,
    selectedDeadline,
    selectDeadline,
    loadInitialData,
    isLoading,
    openCreateModal,
    user,
  } = useDeadlineStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
      // Ignore if typing inside input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

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
      {/* Desktop Collapsible Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
            <Sidebar
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
              {activeTab === 'overview' && <Dashboard />}
              {activeTab === 'my-deadlines' && <MyDeadlinesView />}
              {activeTab === 'upcoming' && (
                <MyDeadlinesView filterStatus="upcoming" title="Upcoming Deadlines" />
              )}
              {activeTab === 'in-progress' && (
                <MyDeadlinesView filterStatus="in_progress" title="Active In-Progress Work" />
              )}
              {activeTab === 'completed' && (
                <MyDeadlinesView filterStatus="completed" title="Completed Deliverables" />
              )}
              {activeTab === 'deliverables' && <DeliverablesView />}
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

