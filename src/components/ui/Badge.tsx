import React from 'react';
import { cn } from '@/lib/utils';
import { Priority, DeadlineStatus } from '@/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'subtle';
  priority?: Priority;
  status?: DeadlineStatus | 'overdue';
  type?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  priority,
  status,
  size = 'sm',
  ...props
}) => {
  let styleClasses = 'bg-secondary text-secondary-foreground border-transparent';

  if (priority) {
    switch (priority) {
      case 'critical':
        styleClasses = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        break;
      case 'high':
        styleClasses = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        break;
      case 'medium':
        styleClasses = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        break;
      case 'low':
        styleClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'completed':
        styleClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        break;
      case 'in_progress':
        styleClasses = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
        break;
      case 'review':
        styleClasses = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        break;
      case 'not_started':
        styleClasses = 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
        break;
      case 'overdue':
        styleClasses = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse';
        break;
    }
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md border tracking-tight transition-colors',
        sizeClasses,
        styleClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
