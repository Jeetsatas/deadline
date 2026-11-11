import React, { useState, useEffect } from 'react';
import { cn, formatTimeRemaining } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  dueDateTime: string;
  isCompleted?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  dueDateTime,
  isCompleted = false,
  className,
  showIcon = true,
  size = 'md',
}) => {
  const [time, setTime] = useState(() => formatTimeRemaining(dueDateTime));

  useEffect(() => {
    if (isCompleted) return;

    // Update immediately and then every second
    setTime(formatTimeRemaining(dueDateTime));
    const interval = setInterval(() => {
      setTime(formatTimeRemaining(dueDateTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [dueDateTime, isCompleted]);

  if (isCompleted) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-medium',
          className
        )}
      >
        {showIcon && <CheckCircle2 className="h-3.5 w-3.5" />}
        <span>Delivered on time</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds, isOverdue } = time;

  // Urgency logic:
  // Overdue -> Red
  // Less than 24 hours -> Amber/Orange
  // Normal -> Subtle zinc / primary
  const isImminent = !isOverdue && days === 0 && hours < 24;

  const colorClasses = isOverdue
    ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
    : isImminent
    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse-subtle'
    : 'text-zinc-700 dark:text-zinc-300 bg-secondary/80 border-border/80';

  if (size === 'sm') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded border transition-colors',
          colorClasses,
          className
        )}
      >
        {showIcon && (
          isOverdue ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Clock className="h-3 w-3 shrink-0" />
        )}
        <span>
          {isOverdue && 'Overdue: '}
          {days > 0 ? `${days}d ` : ''}
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={cn(
          'p-4 rounded-xl border flex flex-col items-center justify-center transition-all',
          colorClasses,
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider uppercase">
          {isOverdue ? (
            <>
              <AlertTriangle className="h-4 w-4 animate-bounce" />
              <span>Deadline Overdue</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              <span>Time Remaining Until Deliverable Due</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center w-full max-w-sm">
          <div className="bg-background/80 backdrop-blur rounded-lg p-2 border border-border/40">
            <span className="block font-mono text-2xl sm:text-3xl font-bold tracking-tight">
              {String(days).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Days</span>
          </div>
          <div className="bg-background/80 backdrop-blur rounded-lg p-2 border border-border/40">
            <span className="block font-mono text-2xl sm:text-3xl font-bold tracking-tight">
              {String(hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Hours</span>
          </div>
          <div className="bg-background/80 backdrop-blur rounded-lg p-2 border border-border/40">
            <span className="block font-mono text-2xl sm:text-3xl font-bold tracking-tight">
              {String(minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Mins</span>
          </div>
          <div className="bg-background/80 backdrop-blur rounded-lg p-2 border border-border/40">
            <span className="block font-mono text-2xl sm:text-3xl font-bold tracking-tight">
              {String(seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Secs</span>
          </div>
        </div>
      </div>
    );
  }

  // Size md
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs px-2.5 py-1 rounded-md border font-medium transition-colors',
        colorClasses,
        className
      )}
    >
      {showIcon && (
        isOverdue ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>
        {isOverdue && 'OVERDUE: '}
        {days > 0 && <span className="font-semibold">{days}d </span>}
        <span className="font-semibold">
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </span>
    </div>
  );
};
