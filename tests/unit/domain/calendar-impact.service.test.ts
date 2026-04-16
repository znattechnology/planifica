import { describe, it, expect } from 'vitest';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import type { CalendarEvent, CalendarTerm, SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';

function makeEvent(overrides: Partial<CalendarEvent> & { startDate: Date; endDate: Date; type: CalendarEventType }): CalendarEvent {
  return {
    id: 'evt-1',
    calendarId: 'cal-1',
    title: 'Test Event',
    allDay: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeTerm(overrides: Partial<CalendarTerm>): CalendarTerm {
  return {
    id: 'term-1',
    calendarId: 'cal-1',
    name: '1.º Trimestre',
    trimester: 1,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-12-12'),
    teachingWeeks: 13,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('CalendarImpactService', () => {
  const service = new CalendarImpactService();

  describe('analyzeWeekImpact', () => {
    it('should return no impact for a clean week', () => {
      const result = service.analyzeWeekImpact(
        new Date('2025-09-01'), // Monday
        new Date('2025-09-05'), // Friday
        [],
      );

      expect(result.hasHoliday).toBe(false);
      expect(result.hasBreak).toBe(false);
      expect(result.hasExam).toBe(false);
      expect(result.lessonReduction).toBe(0);
      expect(result.events).toHaveLength(0);
      expect(result.message).toBe('');
    });

    it('should detect holiday and reduce lessons', () => {
      const holiday = makeEvent({
        title: 'Dia da Independência',
        startDate: new Date('2025-11-11'),
        endDate: new Date('2025-11-11'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
      });

      const result = service.analyzeWeekImpact(
        new Date('2025-11-10'), // Monday
        new Date('2025-11-14'), // Friday
        [holiday],
      );

      expect(result.hasHoliday).toBe(true);
      expect(result.lessonReduction).toBe(0.2); // 1 day out of 5
      expect(result.events).toHaveLength(1);
      expect(result.message).toContain('Feriado');
    });

    it('should block full week on trimester break', () => {
      const breakEvent = makeEvent({
        title: 'Férias de Natal',
        startDate: new Date('2025-12-20'),
        endDate: new Date('2026-01-07'),
        type: CalendarEventType.TRIMESTER_BREAK,
      });

      const result = service.analyzeWeekImpact(
        new Date('2025-12-22'), // Monday
        new Date('2025-12-26'), // Friday
        [breakEvent],
      );

      expect(result.hasBreak).toBe(true);
      expect(result.lessonReduction).toBe(1);
      expect(result.message).toContain('férias');
    });

    it('should detect exam period and suggest review', () => {
      const exam = makeEvent({
        title: 'Provas do 1.º Trimestre',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        type: CalendarEventType.EXAM_PERIOD,
      });

      const result = service.analyzeWeekImpact(
        new Date('2025-12-01'),
        new Date('2025-12-05'),
        [exam],
      );

      expect(result.hasExam).toBe(true);
      expect(result.lessonReduction).toBe(0.5);
      expect(result.message).toContain('avaliação');
    });

    it('should detect pedagogical activity', () => {
      const pedagogical = makeEvent({
        title: 'Jornada Pedagógica',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-05'),
        type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
      });

      const result = service.analyzeWeekImpact(
        new Date('2025-09-01'),
        new Date('2025-09-05'),
        [pedagogical],
      );

      expect(result.hasPedagogicalActivity).toBe(true);
      expect(result.lessonReduction).toBe(1);
      expect(result.message).toContain('pedagógica');
    });

    it('should cap reduction at 1.0 for multiple events', () => {
      const events = [
        makeEvent({
          id: 'evt-1',
          title: 'Feriado',
          startDate: new Date('2025-11-10'),
          endDate: new Date('2025-11-10'),
          type: CalendarEventType.NATIONAL_HOLIDAY,
        }),
        makeEvent({
          id: 'evt-2',
          title: 'Férias',
          startDate: new Date('2025-11-10'),
          endDate: new Date('2025-11-14'),
          type: CalendarEventType.TRIMESTER_BREAK,
        }),
      ];

      const result = service.analyzeWeekImpact(
        new Date('2025-11-10'),
        new Date('2025-11-14'),
        events,
      );

      expect(result.lessonReduction).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeTermImpact', () => {
    it('should calculate effective weeks for a term', () => {
      const term = makeTerm({
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-12'),
        teachingWeeks: 13,
      });

      const holiday = makeEvent({
        title: 'Dia da Independência',
        startDate: new Date('2025-11-11'),
        endDate: new Date('2025-11-11'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
      });

      const result = service.analyzeTermImpact(term, [holiday]);

      expect(result.trimester).toBe(1);
      expect(result.nominalWeeks).toBe(13);
      expect(result.effectiveWeeks).toBeLessThan(13);
      expect(result.totalLostDays).toBeGreaterThan(0);
      expect(result.weekImpacts.length).toBeGreaterThan(0);
    });

    it('should return full nominal weeks when no events', () => {
      const term = makeTerm({
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-12'),
        teachingWeeks: 13,
      });

      const result = service.analyzeTermImpact(term, []);

      expect(result.effectiveWeeks).toBe(13);
      expect(result.totalLostDays).toBe(0);
    });
  });

  describe('simulateEventImpact', () => {
    it('should not persist data', () => {
      const calendar: SchoolCalendar = {
        id: 'cal-1',
        userId: 'user-1',
        academicYear: '2025/2026',
        country: 'Angola',
        type: 'MINISTERIAL' as any,
        isActive: true,
        version: 1,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-18'),
        terms: [makeTerm({})],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventsBefore = calendar.events.length;

      const result = service.simulateEventImpact(calendar, {
        title: 'Novo Feriado',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-15'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
        allDay: true,
      });

      // Calendar events not modified
      expect(calendar.events.length).toBe(eventsBefore);
      // Result has data
      expect(result.affectedWeeks.length).toBeGreaterThan(0);
      expect(result.message).toBeTruthy();
    });

    it('should return coherent impact for a new holiday', () => {
      const calendar: SchoolCalendar = {
        id: 'cal-1',
        userId: 'user-1',
        academicYear: '2025/2026',
        country: 'Angola',
        type: 'MINISTERIAL' as any,
        isActive: true,
        version: 1,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-18'),
        terms: [makeTerm({})],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.simulateEventImpact(calendar, {
        title: 'Novo Feriado',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-15'),
        type: CalendarEventType.NATIONAL_HOLIDAY,
        allDay: true,
      });

      expect(result.totalLessonReduction).toBeGreaterThan(0);
      expect(result.affectedWeeks.length).toBe(1);
      expect(result.affectedWeeks[0].impact.hasHoliday).toBe(true);
    });
  });
});
