import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  let formatted = '';
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
