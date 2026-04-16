import { describe, it, expect } from 'vitest';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { WorkloadAdjustmentService } from '@/src/domain/services/workload-adjustment.service';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

describe('WorkloadAdjustmentService', () => {
  const impactService = new CalendarImpactService();
  const service = new WorkloadAdjustmentService(impactService);

  const baseContext: CalendarContext = {
    terms: [
      {
        trimester: 1,
        startDate: '2025-09-01',
        endDate: '2025-11-28',
        teachingWeeks: 12,
      },
    ],
    events: [],
  };

  it('should keep all weeks at base lessons when there are no events', () => {
    const result = service.adjustForTrimester(baseContext, 1, 4);

    expect(result).not.toBeNull();
    for (const week of result!.weeks) {
      expect(week.adjustedLessons).toBe(4);
      expect(week.isNonTeaching).toBe(false);
      expect(week.isReviewWeek).toBe(false);
    }
  });

  it('should reduce adjusted lessons for a week with a holiday', () => {
    const context: CalendarContext = {
      ...baseContext,
      events: [
        { title: 'Feriado Nacional', startDate: '2025-09-15', endDate: '2025-09-15', type: 'NATIONAL_HOLIDAY' },
      ],
    };

    const result = service.adjustForTrimester(context, 1, 4);
    expect(result).not.toBeNull();

    // Week containing Sep 15 (Mon Sep 15 - Fri Sep 19)
    const holidayWeek = result!.weeks.find(w => w.weekStart === '2025-09-15');
    expect(holidayWeek).toBeDefined();
    expect(holidayWeek!.adjustedLessons).toBeLessThan(4);
    expect(holidayWeek!.isNonTeaching).toBe(false);
  });

  it('should mark week as non-teaching with 0 lessons during a break', () => {
    const context: CalendarContext = {
      ...baseContext,
      events: [
        { title: 'Ferias', startDate: '2025-10-20', endDate: '2025-10-24', type: 'TRIMESTER_BREAK' },
      ],
    };

    const result = service.adjustForTrimester(context, 1, 4);
    expect(result).not.toBeNull();

    // Week of Oct 20-24
    const breakWeek = result!.weeks.find(w => w.weekStart === '2025-10-20');
    expect(breakWeek).toBeDefined();
    expect(breakWeek!.adjustedLessons).toBe(0);
    expect(breakWeek!.isNonTeaching).toBe(true);
  });

  it('should mark week as review week during an exam period', () => {
    const context: CalendarContext = {
      ...baseContext,
      events: [
        { title: 'Provas', startDate: '2025-11-17', endDate: '2025-11-21', type: 'EXAM_PERIOD' },
      ],
    };

    const result = service.adjustForTrimester(context, 1, 4);
    expect(result).not.toBeNull();

    const examWeek = result!.weeks.find(w => w.weekStart === '2025-11-17');
    expect(examWeek).toBeDefined();
    expect(examWeek!.isReviewWeek).toBe(true);
  });

  it('should return null when trimester is not found', () => {
    const result = service.adjustForTrimester(baseContext, 99, 4);
    expect(result).toBeNull();
  });

  it('should compute total adjusted lessons correctly', () => {
    const context: CalendarContext = {
      ...baseContext,
      events: [
        { title: 'Ferias', startDate: '2025-10-20', endDate: '2025-10-24', type: 'TRIMESTER_BREAK' },
      ],
    };

    const result = service.adjustForTrimester(context, 1, 4);
    expect(result).not.toBeNull();

    const manualSum = result!.weeks.reduce((sum, w) => sum + w.adjustedLessons, 0);
    expect(result!.totalAdjustedLessons).toBe(manualSum);
    // At least one week is non-teaching, so total should be less than weeks * base
    expect(result!.totalAdjustedLessons).toBeLessThan(result!.weeks.length * 4);
  });
});
