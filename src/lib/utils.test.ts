import { describe, it, expect } from 'vitest';
import {
  formatTimeRemaining,
  formatDate,
  formatDateTime,
  cn,
  createIsoFromLocal,
  getLocalDateString,
  isDueToday,
  isDueTomorrow,
  isSameDay,
} from './utils';

describe('utils', () => {
  it('combines classes properly using cn()', () => {
    const isFalse = false;
    expect(cn('base-class', isFalse && 'conditional', 'final-class')).toBe('base-class final-class');
  });

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-11-12T18:00:00.000Z');
    expect(formatted).toContain('Nov');
    expect(formatted).toContain('2026');
  });

  it('formats date and time consistently', () => {
    const formatted = formatDateTime('2026-11-12T18:00:00.000Z');
    expect(formatted).toContain('Nov');
    expect(formatted).toContain('2026');
  });

  it('creates reliable ISO from local date and time without UTC drift', () => {
    const iso = createIsoFromLocal('2026-11-12', '18:00');
    const parsed = new Date(iso);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10); // 0-indexed November
    expect(parsed.getDate()).toBe(12);
    expect(parsed.getHours()).toBe(18);
  });

  it('accurately identifies local calendar days', () => {
    const now = new Date();
    const todayIso = now.toISOString();
    expect(isDueToday(todayIso, now)).toBe(true);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDueTomorrow(tomorrow.toISOString(), now)).toBe(true);
    expect(isDueToday(tomorrow.toISOString(), now)).toBe(false);

    expect(isSameDay(now, new Date(now.getTime()))).toBe(true);
    expect(isSameDay(now, tomorrow)).toBe(false);
  });

  it('extracts local date string YYYY-MM-DD properly', () => {
    const d = new Date(2026, 10, 15, 14, 30);
    expect(getLocalDateString(d)).toBe('2026-11-15');
  });

  it('accurately identifies future deadline as not overdue', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimeRemaining(futureDate);
    expect(result.isOverdue).toBe(false);
    expect(result.days).toBeGreaterThanOrEqual(9);
    expect(result.formatted).toContain('left');
  });

  it('accurately identifies past deadline as overdue', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimeRemaining(pastDate);
    expect(result.isOverdue).toBe(true);
    expect(result.formatted).toContain('overdue');
  });
});
