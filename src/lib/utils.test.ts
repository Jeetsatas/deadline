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
  generateDeadlineMarkdownReport,
} from './utils';
import { Deadline } from '@/types';

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

  it('generates a comprehensive Markdown report for a deadline', () => {
    const testDeadline: Deadline = {
      id: 'dl_report_test',
      title: 'Report Test Project',
      description: 'A test project for report generation',
      expectedOutput: 'Clean markdown report output',
      minimumAcceptableOutput: 'Draft report',
      priority: 'high',
      status: 'in_progress',
      deadlineDate: '2026-11-20',
      deadlineTime: '18:00',
      dueDateTime: '2026-11-20T18:00:00.000Z',
      progress: 50,
      deliverableType: 'software',
      executionApproach: 'prototype_first',
      referenceLinks: [{ id: 'ref1', title: 'Docs', url: 'https://docs.example.com', createdAt: '2026-11-01' }],
      attachments: [],
      milestones: [
        {
          id: 'm1',
          deadlineId: 'dl_report_test',
          title: 'Milestone 1',
          isCompleted: true,
          order: 1,
          createdAt: '2026-11-01',
          updatedAt: '2026-11-01',
        },
      ],
      notes: 'Test execution notes',
      tags: ['test'],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    };

    const report = generateDeadlineMarkdownReport(testDeadline);
    expect(report).toContain('# Project Execution Report: Report Test Project');
    expect(report).toContain('PROTOTYPE FIRST');
    expect(report).toContain('Clean markdown report output');
    expect(report).toContain('Draft report');
    expect(report).toContain('[x] Milestone 1');
    expect(report).toContain('Test execution notes');
    expect(report).toContain('[Docs](https://docs.example.com)');
  });
});
