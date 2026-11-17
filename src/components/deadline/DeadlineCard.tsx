import React from 'react';
import { Deadline } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Target,
  Layers,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useDeadlineStore } from '@/store/useDeadlineStore';

interface DeadlineCardProps {
  deadline: Deadline;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({
  deadline,
  onClick,
  variant = 'default',
}) => {
  const { selectDeadline, openCreateModal, deleteDeadline } = useDeadlineStore();
  const [showMenu, setShowMenu] = React.useState(false);

  const completedMilestones = deadline.milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = deadline.milestones.length;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      selectDeadline(deadline.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    openCreateModal(deadline);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Are you sure you want to delete "${deadline.title}"?`)) {
      deleteDeadline(deadline.id);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={handleCardClick}
        className="group relative flex items-center justify-between p-4 border border-border bg-card hover:bg-secondary/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              deadline.status === 'completed'
                ? 'bg-emerald-500'
                : deadline.priority === 'critical'
                ? 'bg-red-500'
                : 'bg-primary'
            }`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-medium tracking-tight truncate group-hover:text-primary transition-colors">
              {deadline.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate font-mono">
              Due {formatDate(deadline.deadlineDate)} • {deadline.expectedOutput}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CountdownTimer dueDateTime={deadline.dueDateTime} isCompleted={deadline.status === 'completed'} size="sm" />
          <Badge priority={deadline.priority}>{deadline.priority}</Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between p-5 border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
    >
      {/* Top Header: Title, Tags, Context Menu */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge priority={deadline.priority}>{deadline.priority}</Badge>
            <Badge status={deadline.status}>{deadline.status.replace('_', ' ')}</Badge>
            {deadline.executionApproach && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
                {deadline.executionApproach === 'prototype_first'
                  ? '⚡ Prototype First'
                  : deadline.executionApproach === 'guided_execution'
                  ? '🧭 Guided'
                  : '🎯 Output Only'}
              </span>
            )}
            {deadline.finalDeliverable && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Deliverable Submitted
              </Badge>
            )}
          </div>

          {/* Quick options menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-7 z-20 w-36 rounded-md border border-border bg-popover p-1 shadow-lg text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-muted-foreground hover:bg-secondary hover:text-foreground rounded"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-red-500 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors mb-1.5 line-clamp-1">
          {deadline.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {deadline.description}
        </p>

        {/* Expected Output Highlight - The core philosophy */}
        <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/60 mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <Target className="h-3 w-3 text-primary" />
            <span>Target Deliverable</span>
          </div>
          <p className="text-xs font-medium text-foreground line-clamp-2">
            {deadline.expectedOutput}
          </p>
        </div>
      </div>

      {/* Execution Progress & Milestones */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>
              {totalMilestones > 0
                ? `${completedMilestones}/${totalMilestones} milestones`
                : 'No milestones set'}
            </span>
          </div>
          <span className="font-mono font-semibold">{deadline.progress}%</span>
        </div>

        <ProgressBar progress={deadline.progress} size="sm" isCompleted={deadline.status === 'completed'} />

        {/* Date, Countdown & Footer CTA */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-mono">{formatDate(deadline.deadlineDate)}</span>
          </div>

          <CountdownTimer
            dueDateTime={deadline.dueDateTime}
            isCompleted={deadline.status === 'completed'}
            size="sm"
          />
        </div>

        {/* Action Link to Workspace */}
        <div className="pt-1 flex items-center justify-end text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
          <span className="inline-flex items-center gap-1">
            Open Workspace <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

