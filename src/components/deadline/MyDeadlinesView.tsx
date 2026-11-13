import React from 'react';
import { DeadlineManager, DeadlineManagerTab } from './DeadlineManager';

interface MyDeadlinesViewProps {
  filterStatus?: 'all' | 'in_progress' | 'upcoming' | 'completed';
  title?: string;
}

export const MyDeadlinesView: React.FC<MyDeadlinesViewProps> = ({ filterStatus = 'all' }) => {
  const tabMap: Record<string, DeadlineManagerTab> = {
    all: 'all',
    in_progress: 'active',
    upcoming: 'upcoming',
    completed: 'completed',
  };

  return <DeadlineManager initialTab={tabMap[filterStatus] || 'all'} />;
};
