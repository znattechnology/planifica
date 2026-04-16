import { describe, it, expect } from 'vitest';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { CalendarEventType, CalendarType } from '@/src/domain/entities/school-calendar.entity';
import type { SchoolCalendar, CalendarTerm, CalendarEvent } from '@/src/domain/entities/school-calendar.entity';

function makeTerm(overrides: Partial<CalendarTerm>): CalendarTerm {
  return {
    id: 'term-1',
    calendarId: 'cal-1',
    name: '1.o Trimestre',
    trimester: 1,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-11-28'),
    teachingWeeks: 12,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> & { startDate: Date; endDate: Date; type: CalendarEventType }): CalendarEvent {
  return {
    id: 'evt-1',
    calendarId: 'cal-1',
    title: 'Event',
    allDay: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeCalendar(terms: CalendarTerm[], events: CalendarEvent[]): SchoolCalendar {
  return {
    id: 'cal-1',
    userId: 'user-1',
    academicYear: '2025',
    country: 'AO',
    type: CalendarType.MINISTERIAL,
    isActive: true,
    version: 1,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    terms,
    events,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('CalendarImpactService.computeCalendarImpactScore', () => {
  const service = new CalendarImpactService();

  it('should return score 10 for an empty calendar with no terms', () => {
    const calendar = makeCalendar([], []);
    const result = service.computeCalendarImpactScore(calendar);

    expect(result.score).toBe(10);
    expect(result.breakdown.termScores).toHaveLength(0);
    expect(result.breakdown.eventDensity).toBe(0);
    expect(result.breakdown.overlapPenalty).toBe(0);
  });

  it('should return score 10 for a calendar with terms but no events', () => {
    const term = makeTerm({
      trimester: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-11-28'),
      teachingWeeks: 12,
    });
    const calendar = makeCalendar([term], []);
    const result = service.computeCalendarImpactScore(calendar);

    expect(result.score).toBe(10);
    expect(result.breakdown.termScores).toHaveLength(1);
  });

  it('should return a score less than 10 when holidays reduce effective weeks', () => {
    const term = makeTerm({
      trimester: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-11-28'),
      teachingWeeks: 12,
    });

    const events = [
      makeEvent({
        id: 'evt-h1',
        title: 'Feriado 1',
        startDate: new Date('2025-09-15'),
        endDate: new Date('2025-09-15'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
      }),
      makeEvent({
        id: 'evt-h2',
        title: 'Feriado 2',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-01'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
      }),
      makeEvent({
        id: 'evt-break',
        title: 'Ferias de meio trimestre',
        startDate: new Date('2025-10-20'),
        endDate: new Date('2025-10-24'),
        type: CalendarEventType.TRIMESTER_BREAK,
      }),
    ];

    const calendar = makeCalendar([term], events);
    const result = service.computeCalendarImpactScore(calendar);

    expect(result.score).toBeLessThan(10);
    expect(result.breakdown.termScores[0].score).toBeLessThan(10);
  });

  it('should apply overlap penalty when exam period overlaps with a holiday', () => {
    const term = makeTerm({
      trimester: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-11-28'),
      teachingWeeks: 12,
    });

    const events = [
      makeEvent({
        id: 'evt-exam',
        title: 'Provas',
        startDate: new Date('2025-11-17'),
        endDate: new Date('2025-11-21'),
        type: CalendarEventType.EXAM_PERIOD,
      }),
      makeEvent({
        id: 'evt-holiday',
        title: 'Feriado durante provas',
        startDate: new Date('2025-11-19'),
        endDate: new Date('2025-11-19'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
      }),
    ];

    const calendar = makeCalendar([term], events);
    const result = service.computeCalendarImpactScore(calendar);

    expect(result.breakdown.overlapPenalty).toBeGreaterThan(0);
    // Score should be reduced due to both events and overlap penalty
    expect(result.score).toBeLessThan(10);
  });
});
