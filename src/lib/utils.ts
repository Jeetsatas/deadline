import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
