import { Deadline, Milestone } from '@/types';

/**
 * Execution Engine Architectural Foundation
 *
 * Focuses on:
 * - Minimum acceptable output (MVP deliverable)
 * - Critical path milestones
 * - Velocity & progress computation
 * - Verification before submission
 */

export interface ExecutionBottleneck {
  id: string;
  type: 'approaching_deadline' | 'stalled_milestone' | 'missing_output_definition' | 'low_velocity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}

export interface ExecutionPlan {
  deadlineId: string;
  expectedOutput: string;
  minimumAcceptableOutput?: string;
  completionScore: number; // 0 - 100 calculated from milestones & progress
  milestonesCount: number;
  completedMilestonesCount: number;
  isPrototypePrioritized: boolean;
  bottlenecks: ExecutionBottleneck[];
}

export interface IExecutionEngine {
  analyzeDeadline(deadline: Deadline): ExecutionPlan;
  calculateProgress(milestones: Milestone[], explicitProgress?: number): number;
  identifyBottlenecks(deadline: Deadline): ExecutionBottleneck[];
}

export class DefaultExecutionEngine implements IExecutionEngine {
  calculateProgress(milestones: Milestone[], explicitProgress?: number): number {
    if (milestones.length === 0) {
      return explicitProgress ?? 0;
    }
    const completed = milestones.filter((m) => m.isCompleted).length;
    const milestonePercentage = Math.round((completed / milestones.length) * 100);

    // If explicit progress is provided and differs, blend or give weight to milestones
    if (explicitProgress !== undefined && explicitProgress > 0) {
      return Math.round(milestonePercentage * 0.7 + explicitProgress * 0.3);
    }
    return milestonePercentage;
  }

  identifyBottlenecks(deadline: Deadline): ExecutionBottleneck[] {
    const bottlenecks: ExecutionBottleneck[] = [];
    const now = new Date().getTime();
    const target = new Date(deadline.dueDateTime).getTime();
    const diffHours = (target - now) / (1000 * 60 * 60);

    if (deadline.status !== 'completed') {
      if (diffHours < 0) {
        bottlenecks.push({
          id: 'overdue',
          type: 'approaching_deadline',
          severity: 'critical',
          message: 'Deadline is past due date.',
          recommendation: 'Prioritize minimum acceptable output and complete final deliverable immediately.',
        });
      } else if (diffHours < 24 && deadline.progress < 50) {
        bottlenecks.push({
          id: 'imminent-danger',
          type: 'approaching_deadline',
          severity: 'high',
          message: 'Due in less than 24 hours with under 50% execution progress.',
          recommendation: 'Strip scope down to minimum acceptable deliverable.',
        });
      }
    }

    if (!deadline.minimumAcceptableOutput && deadline.priority === 'critical') {
      bottlenecks.push({
        id: 'no-mvp',
        type: 'missing_output_definition',
        severity: 'medium',
        message: 'Critical deadline without defined Minimum Acceptable Output.',
        recommendation: 'Define minimum viable output to avoid last-minute failure.',
      });
    }

    return bottlenecks;
  }

  analyzeDeadline(deadline: Deadline): ExecutionPlan {
    const completedMilestones = deadline.milestones.filter((m) => m.isCompleted).length;
    const calculatedProgress = this.calculateProgress(deadline.milestones, deadline.progress);
    const bottlenecks = this.identifyBottlenecks(deadline);

    return {
      deadlineId: deadline.id,
      expectedOutput: deadline.expectedOutput,
      minimumAcceptableOutput: deadline.minimumAcceptableOutput,
      completionScore: calculatedProgress,
      milestonesCount: deadline.milestones.length,
      completedMilestonesCount: completedMilestones,
      isPrototypePrioritized:
        deadline.deliverableType === 'prototype' ||
        deadline.deliverableType === 'software' ||
        deadline.expectedOutput.toLowerCase().includes('prototype'),
      bottlenecks,
    };
  }
}

export const executionEngine: IExecutionEngine = new DefaultExecutionEngine();
