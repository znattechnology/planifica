import { describe, it, expect } from 'vitest';
import { CalendarInsightsService } from '@/src/domain/services/calendar-insights.service';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { CalendarEventType, CalendarType } from '@/src/domain/entities/school-calendar.entity';
import type { SchoolCalendar, CalendarEvent, CalendarTerm } from '@/src/domain/entities/school-calendar.entity';

function makeCalendar(overrides?: Partial<SchoolCalendar>): SchoolCalendar {
  return {
    id: 'cal-1',
    userId: 'user-1',
    academicYear: '2025/2026',
    country: 'Angola',
    type: CalendarType.MINISTERIAL,
    isActive: true,
    version: 1,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-07-18'),
    terms: [
      { id: 't1', calendarId: 'cal-1', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-12'), teachingWeeks: 13, createdAt: new Date() },
      { id: 't2', calendarId: 'cal-1', name: '2.º Trimestre', trimester: 2, startDate: new Date('2026-01-08'), endDate: new Date('2026-03-28'), teachingWeeks: 10, createdAt: new Date() },
      { id: 't3', calendarId: 'cal-1', name: '3.º Trimestre', trimester: 3, startDate: new Date('2026-04-21'), endDate: new Date('2026-07-11'), teachingWeeks: 10, createdAt: new Date() },
    ],
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEvent(title: string, start: string, end: string, type: CalendarEventType): CalendarEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    calendarId: 'cal-1',
    title,
    startDate: new Date(start),
    endDate: new Date(end),
    type,
    allDay: true,
    createdAt: new Date(),
  };
}

describe('CalendarInsightsService', () => {
  const impactService = new CalendarImpactService();
  const service = new CalendarInsightsService(impactService);

  it('should return stats for a calendar', () => {
    const calendar = makeCalendar({
      events: [
        makeEvent('Independência', '2025-11-11', '2025-11-11', CalendarEventType.NATIONAL_HOLIDAY),
        makeEvent('Natal', '2025-12-25', '2025-12-25', CalendarEventType.NATIONAL_HOLIDAY),
        makeEvent('Provas', '2025-12-01', '2025-12-05', CalendarEventType.EXAM_PERIOD),
      ],
    });

    const result = service.generateInsights(calendar);

    expect(result.stats.totalTeachingWeeks).toBe(33);
    expect(result.stats.totalHolidays).toBe(2);
    expect(result.stats.totalExamPeriods).toBe(1);
    expect(result.stats.totalEvents).toBe(3);
    expect(result.stats.effectiveTeachingWeeks).toBeLessThan(33);
    expect(result.stats.busiestMonth).toBeTruthy();
  });

  it('should warn about short terms', () => {
    const calendar = makeCalendar({
      terms: [
        { id: 't1', calendarId: 'cal-1', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-10-10'), teachingWeeks: 5, createdAt: new Date() },
      ],
      events: [],
    });

    const result = service.generateInsights(calendar);
    const shortTermWarning = result.insights.find(i => i.code === 'SHORT_TERM');
    expect(shortTermWarning).toBeTruthy();
    expect(shortTermWarning!.severity).toBe('warning');
  });

  it('should warn about low total weeks', () => {
    const calendar = makeCalendar({
      terms: [
        { id: 't1', calendarId: 'cal-1', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-12'), teachingWeeks: 9, createdAt: new Date() },
        { id: 't2', calendarId: 'cal-1', name: '2.º Trimestre', trimester: 2, startDate: new Date('2026-01-08'), endDate: new Date('2026-03-28'), teachingWeeks: 9, createdAt: new Date() },
        { id: 't3', calendarId: 'cal-1', name: '3.º Trimestre', trimester: 3, startDate: new Date('2026-04-21'), endDate: new Date('2026-07-11'), teachingWeeks: 9, createdAt: new Date() },
      ],
      events: [],
    });

    const result = service.generateInsights(calendar);
    const lowWeeksWarning = result.insights.find(i => i.code === 'LOW_TOTAL_WEEKS');
    expect(lowWeeksWarning).toBeTruthy();
  });

  it('should detect holidays on weekends', () => {
    // 2025-11-15 is a Saturday
    const calendar = makeCalendar({
      events: [
        makeEvent('Feriado no Sábado', '2025-11-15', '2025-11-15', CalendarEventType.NATIONAL_HOLIDAY),
      ],
    });

    const result = service.generateInsights(calendar);
    const weekendInfo = result.insights.find(i => i.code === 'HOLIDAY_ON_WEEKEND');
    expect(weekendInfo).toBeTruthy();
    expect(weekendInfo!.severity).toBe('info');
  });

  it('should detect exam-holiday overlap', () => {
    const calendar = makeCalendar({
      events: [
        makeEvent('Provas', '2025-11-10', '2025-11-14', CalendarEventType.EXAM_PERIOD),
        makeEvent('Independência', '2025-11-11', '2025-11-11', CalendarEventType.NATIONAL_HOLIDAY),
      ],
    });

    const result = service.generateInsights(calendar);
    const overlap = result.insights.find(i => i.code === 'EXAM_HOLIDAY_OVERLAP');
    expect(overlap).toBeTruthy();
    expect(overlap!.severity).toBe('warning');
  });

  it('should detect terms with no events', () => {
    const calendar = makeCalendar({ events: [] });
    const result = service.generateInsights(calendar);
    const noEvents = result.insights.filter(i => i.code === 'TERM_NO_EVENTS');
    expect(noEvents.length).toBe(3); // All 3 terms have no events
  });

  it('should warn about high event impact', () => {
    // Add a long break that blocks many weeks to get > 15% reduction
    const events: CalendarEvent[] = [
      // A 4-week break in trimester 1 will cause significant reduction
      makeEvent('Interrupção Longa', '2025-10-01', '2025-10-31', CalendarEventType.TRIMESTER_BREAK),
      makeEvent('Outra Interrupção', '2025-11-17', '2025-11-28', CalendarEventType.TRIMESTER_BREAK),
    ];

    const calendar = makeCalendar({ events });
    const result = service.generateInsights(calendar);
    const highImpact = result.insights.find(i => i.code === 'HIGH_EVENT_IMPACT');
    expect(highImpact).toBeTruthy();
  });
});
