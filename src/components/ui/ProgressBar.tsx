import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number; // 0 - 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  isCompleted?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showLabel = false,
  className,
  isCompleted = false,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const fillClasses =
    isCompleted || clamped === 100
      ? 'bg-emerald-500'
      : clamped > 60
      ? 'bg-primary'
      : clamped > 25
      ? 'bg-amber-500'
      : 'bg-zinc-400 dark:bg-zinc-500';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">Execution Progress</span>
          <span className="font-mono font-semibold">{clamped}%</span>
        </div>
      )}
      <div className={cn('w-full bg-secondary/80 rounded-full overflow-hidden', heightClasses)}>
        <div
          className={cn('h-full transition-all duration-300 ease-out rounded-full', fillClasses)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
