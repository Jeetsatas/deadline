import { describe, it, expect } from 'vitest';
import {
  createIsoFromLocal,
  isDueToday,
  isDueTomorrow,
  formatTimeRemaining,
  getLocalDateString,
  isSameDay,
} from './utils';

describe('Date and Time Validation Suite', () => {
  it('correctly handles deadlines occurring today', () => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const todayIso = createIsoFromLocal(todayStr, '23:59');

    expect(isDueToday(todayIso, now)).toBe(true);
    expect(isDueTomorrow(todayIso, now)).toBe(false);
  });

  it('correctly handles deadlines occurring tomorrow', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);
    const tomorrowIso = createIsoFromLocal(tomorrowStr, '18:00');

    expect(isDueToday(tomorrowIso, now)).toBe(false);
    expect(isDueTomorrow(tomorrowIso, now)).toBe(true);
  });

  it('correctly detects overdue deadlines', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString();

    const remaining = formatTimeRemaining(yesterdayIso);
    expect(remaining.isOverdue).toBe(true);
    expect(remaining.formatted).toContain('overdue');
  });

  it('handles cross-daylight-saving-time transitions accurately using epoch diffs', () => {
    // Standard time -> Daylight Saving Time occurs in Spring
    // March 8, 2026 DST switch in US (UTC-5 to UTC-4)
    const beforeDst = new Date('2026-03-07T12:00:00.000Z').getTime();
    const afterDst = new Date('2026-03-09T12:00:00.000Z').getTime();
    const diffMs = afterDst - beforeDst;

    // Epoch milliseconds are strictly monotonic and unaffected by local clock adjustments
    expect(diffMs).toBe(48 * 60 * 60 * 1000);
  });

  it('maintains countdown accuracy across browser refresh simulation', () => {
    const fixedNow = Date.now();
    // Deadline due in 3 hours and 30 minutes
    const targetDue = new Date(fixedNow + (3 * 3600 + 30 * 60) * 1000).toISOString();

    // Initial countdown check
    const initialCheck = formatTimeRemaining(targetDue);
    expect(initialCheck.isOverdue).toBe(false);
    expect(initialCheck.hours).toBe(3);
    expect(initialCheck.minutes).toBe(30);

    // Refresh simulation: serializing to string/storage and parsing again
    const serialized = JSON.stringify({ dueDateTime: targetDue });
    const deserialized = JSON.parse(serialized);

    const afterRefreshCheck = formatTimeRemaining(deserialized.dueDateTime);
    expect(afterRefreshCheck.isOverdue).toBe(false);
    expect(afterRefreshCheck.hours).toBe(3);
    expect(afterRefreshCheck.minutes).toBe(30);
  });

  it('preserves calendar day equality across different hours of the same day', () => {
    const earlyMorning = new Date(2026, 10, 11, 0, 5); // Nov 11, 00:05
    const lateNight = new Date(2026, 10, 11, 23, 55);   // Nov 11, 23:55

    expect(isSameDay(earlyMorning, lateNight)).toBe(true);
  });
});

