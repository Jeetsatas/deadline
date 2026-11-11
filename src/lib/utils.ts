import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Deadline } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates an ISO 8601 string from user's local date (YYYY-MM-DD) and time (HH:mm).
 * Preserves the exact moment in the user's local timezone.
 */
export function createIsoFromLocal(dateStr: string, timeStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const time = timeStr || '00:00';
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
  return d.toISOString();
}

/**
 * Extracts the local YYYY-MM-DD from a Date object or ISO string.
 */
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns true if two Date objects fall on the exact same local calendar day.
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if a target ISO date string is due today in the user's local timezone.
 */
export function isDueToday(dueDateTimeIso: string, referenceDate: Date = new Date()): boolean {
  const target = new Date(dueDateTimeIso);
  if (isNaN(target.getTime())) return false;
  return isSameDay(target, referenceDate);
}

/**
 * Checks if a target ISO date string is due tomorrow in the user's local timezone.
 */
export function isDueTomorrow(dueDateTimeIso: string, referenceDate: Date = new Date()): boolean {
  const target = new Date(dueDateTimeIso);
  if (isNaN(target.getTime())) return false;
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(target, tomorrow);
}

/**
 * Calculates remaining time until deadline with second precision.
 * Fully resilient across DST transitions and time zones by comparing epoch milliseconds.
 */
export function formatTimeRemaining(deadlineIso: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formatted: string;
} {
  const target = new Date(deadlineIso).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  let formatted: string;
  if (isOverdue) {
    if (days > 0) formatted = `${days}d ${hours}h overdue`;
    else if (hours > 0) formatted = `${hours}h ${minutes}m overdue`;
    else formatted = `${minutes}m overdue`;
  } else {
    if (days > 0) formatted = `${days}d ${hours}h left`;
    else if (hours > 0) formatted = `${hours}h ${minutes}m left`;
    else formatted = `${minutes}m ${seconds}s left`;
  }

  return { days, hours, minutes, seconds, isOverdue, formatted };
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Generates an executive Markdown report for any deadline.
 * Ideal for academic submissions, manager updates, or client status reviews.
 */
export function generateDeadlineMarkdownReport(deadline: Deadline): string {
  const completedMs = deadline.milestones.filter((m) => m.isCompleted).length;
  const totalMs = deadline.milestones.length;

  let md = `# Project Execution Report: ${deadline.title}\n\n`;
  md += `> **Deadline Execution Platform** — *Work. Build. Deliver.*\n\n`;
  md += `## Overview\n`;
  md += `- **Status:** ${deadline.status.replace('_', ' ').toUpperCase()} (${deadline.progress}% progress)\n`;
  md += `- **Priority:** ${deadline.priority.toUpperCase()}\n`;
  md += `- **Execution Approach:** ${(deadline.executionApproach || 'output_only').replace('_', ' ').toUpperCase()}\n`;
  if (deadline.selectedPrototypeId) {
    md += `- **Prototype Blueprint:** ${deadline.selectedPrototypeId}\n`;
  }
  md += `- **Target Deadline:** ${deadline.deadlineDate} at ${deadline.deadlineTime}\n`;
  md += `- **Category:** ${deadline.deliverableType.replace('_', ' ')}\n\n`;

  md += `## Required Output (The Deliverable)\n`;
  md += `**Target Deliverable:**\n${deadline.expectedOutput}\n\n`;

  if (deadline.minimumAcceptableOutput) {
    md += `**Minimum Acceptable Output (MVP Fallback):**\n${deadline.minimumAcceptableOutput}\n\n`;
  }

  if (deadline.description) {
    md += `## Project Description\n${deadline.description}\n\n`;
  }

  md += `## Execution Milestones (${completedMs}/${totalMs})\n`;
  if (deadline.milestones.length === 0) {
    md += `*No milestones recorded.*\n\n`;
  } else {
    deadline.milestones
      .sort((a, b) => a.order - b.order)
      .forEach((m) => {
        const check = m.isCompleted ? '[x]' : '[ ]';
        const dateNote = m.targetDate ? ` (Target: ${m.targetDate.split('T')[0]})` : '';
        const completedNote = m.completedAt ? ` — *Completed ${m.completedAt.split('T')[0]}*` : '';
        md += `- ${check} ${m.title}${dateNote}${completedNote}\n`;
        if (m.description) {
          md += `  > ${m.description}\n`;
        }
      });
    md += `\n`;
  }

  if (deadline.finalDeliverable) {
    md += `## Final Submitted Deliverable\n`;
    md += `- **Deliverable Title:** ${deadline.finalDeliverable.title}\n`;
    md += `- **Format:** ${deadline.finalDeliverable.submissionFormat.toUpperCase()}\n`;
    md += `- **Resource Link:** ${deadline.finalDeliverable.resourceUri}\n`;
    md += `- **Submitted At:** ${deadline.finalDeliverable.submittedAt}\n`;
    md += `- **Verification Status:** ${deadline.finalDeliverable.status.toUpperCase()}\n`;
    if (deadline.finalDeliverable.summary) {
      md += `- **Summary:** ${deadline.finalDeliverable.summary}\n`;
    }
    if (deadline.finalDeliverable.verificationNotes) {
      md += `- **Verification Notes:** ${deadline.finalDeliverable.verificationNotes}\n`;
    }
    md += `\n`;
  }

  if (deadline.notes) {
    md += `## Technical Execution Notes\n`;
    md += `\`\`\`\n${deadline.notes}\n\`\`\`\n\n`;
  }

  if (deadline.referenceLinks.length > 0) {
    md += `## Reference Links\n`;
    deadline.referenceLinks.forEach((l) => {
      md += `- [${l.title}](${l.url})\n`;
    });
    md += `\n`;
  }

  md += `---\n*Generated by Deadline Platform on ${new Date().toISOString()}*\n`;
  return md;
}
