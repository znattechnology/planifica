import { CalendarEvent, CalendarEventType, CalendarTerm } from '@/src/domain/entities/school-calendar.entity';
import type { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';
import {
  toUTC,
  isWeekday,
  countWeekdaysInRange,
  getOverlapWeekdays,
  getMondayOfWeek,
  formatDatePT,
} from '@/src/shared/utils/calendar-dates';

// ─── Types ───────────────────────────────────────────────

export interface WeekImpact {
  weekStart: string;
  weekEnd: string;
  hasHoliday: boolean;
  hasBreak: boolean;
  hasExam: boolean;
  hasPedagogicalActivity: boolean;
  lessonReduction: number; // 0 to 1 (0 = none, 1 = full week lost)
  events: { title: string; type: string }[];
  message: string;
}

export interface TermImpact {
  trimester: number;
  weekImpacts: WeekImpact[];
  totalLostDays: number;
  effectiveWeeks: number;
  nominalWeeks: number;
}

export interface SimulationResult {
  affectedWeeks: { weekNumber: number; trimester: number; impact: WeekImpact }[];
  totalLessonReduction: number;
  message: string;
}

export interface CalendarImpactScoreBreakdown {
  termScores: { trimester: number; score: number }[];
  eventDensity: number;
  overlapPenalty: number;
}

export interface CalendarImpactScoreResult {
  score: number; // 0-10 (10 = no impact, 0 = maximum impact)
  breakdown: CalendarImpactScoreBreakdown;
}

// ─── Reduction weights per event type ────────────────────

const REDUCTION_PER_DAY: Record<string, number> = {
  [CalendarEventType.NATIONAL_HOLIDAY]: 1.0,
  [CalendarEventType.SCHOOL_HOLIDAY]: 1.0,
  [CalendarEventType.TRIMESTER_BREAK]: 1.0,
  [CalendarEventType.PEDAGOGICAL_ACTIVITY]: 1.0,
  [CalendarEventType.EXAM_PERIOD]: 0.5,
  [CalendarEventType.MAKEUP_EXAM]: 0.7,
  [CalendarEventType.SCHOOL_EVENT]: 0.3,
  [CalendarEventType.CUSTOM]: 0.2,
};

// ─── Service ─────────────────────────────────────────────

export class CalendarImpactService {
  /**
   * Analyze the impact of calendar events on a specific week.
   */
  analyzeWeekImpact(
    weekStart: Date | string,
    weekEnd: Date | string,
    events: CalendarEvent[],
  ): WeekImpact {
    const wStart = toUTC(weekStart);
    const wEnd = toUTC(weekEnd);
    const weekdays = countWeekdaysInRange(wStart, wEnd);
    if (weekdays === 0) {
      return {
        weekStart: wStart.toISOString().split('T')[0],
        weekEnd: wEnd.toISOString().split('T')[0],
        hasHoliday: false,
        hasBreak: false,
        hasExam: false,
        hasPedagogicalActivity: false,
        lessonReduction: 0,
        events: [],
        message: '',
      };
    }

    let totalReduction = 0;
    let hasHoliday = false;
    let hasBreak = false;
    let hasExam = false;
    let hasPedagogicalActivity = false;
    const matchedEvents: { title: string; type: string }[] = [];

    for (const event of events) {
      const eStart = toUTC(event.startDate);
      const eEnd = toUTC(event.endDate);
      const overlapDays = getOverlapWeekdays(wStart, wEnd, eStart, eEnd);
      if (overlapDays === 0) continue;

      matchedEvents.push({ title: event.title, type: event.type });

      const weight = REDUCTION_PER_DAY[event.type] ?? 0;
      totalReduction += (overlapDays / weekdays) * weight;

      if (event.type === CalendarEventType.NATIONAL_HOLIDAY || event.type === CalendarEventType.SCHOOL_HOLIDAY) {
        hasHoliday = true;
      }
      if (event.type === CalendarEventType.TRIMESTER_BREAK) {
        hasBreak = true;
      }
      if (event.type === CalendarEventType.EXAM_PERIOD || event.type === CalendarEventType.MAKEUP_EXAM) {
        hasExam = true;
      }
      if (event.type === CalendarEventType.PEDAGOGICAL_ACTIVITY) {
        hasPedagogicalActivity = true;
      }
    }

    totalReduction = Math.min(totalReduction, 1.0);

    // Build message
    const messages: string[] = [];
    if (hasBreak) messages.push('Semana de férias — sem aulas');
    else if (hasPedagogicalActivity && totalReduction >= 1) messages.push('Jornada pedagógica — sem aulas para alunos');
    else {
      if (hasHoliday) messages.push('Feriado — carga lectiva reduzida');
      if (hasExam) messages.push('Período de avaliação — incluir revisão');
      if (hasPedagogicalActivity) messages.push('Jornada pedagógica — possível redução');
    }

    return {
      weekStart: wStart.toISOString().split('T')[0],
      weekEnd: wEnd.toISOString().split('T')[0],
      hasHoliday,
      hasBreak,
      hasExam,
      hasPedagogicalActivity,
      lessonReduction: Math.round(totalReduction * 100) / 100,
      events: matchedEvents,
      message: messages.join('. ') || '',
    };
  }

  /**
   * Analyze the impact of events across an entire term, week by week.
   */
  analyzeTermImpact(term: CalendarTerm, events: CalendarEvent[]): TermImpact {
    const termStart = toUTC(term.startDate);
    const termEnd = toUTC(term.endDate);
    const weekImpacts: WeekImpact[] = [];

    let monday = getMondayOfWeek(termStart);
    // If the term starts mid-week, still start from its Monday
    if (monday < termStart) {
      monday = termStart;
    }

    let totalLostDays = 0;

    while (monday <= termEnd) {
      const friday = new Date(monday);
      friday.setUTCDate(monday.getUTCDate() + 4);
      const weekEnd = friday > termEnd ? termEnd : friday;

      const impact = this.analyzeWeekImpact(monday, weekEnd, events);
      weekImpacts.push(impact);

      const weekdays = countWeekdaysInRange(monday, weekEnd);
      totalLostDays += weekdays * impact.lessonReduction;

      // Move to next Monday
      monday = new Date(monday);
      monday.setUTCDate(monday.getUTCDate() + 7);
    }

    const nominalWeeks = term.teachingWeeks;
    const lostWeeks = totalLostDays / 5;
    const effectiveWeeks = Math.max(0, Math.round((nominalWeeks - lostWeeks) * 10) / 10);

    return {
      trimester: term.trimester,
      weekImpacts,
      totalLostDays: Math.round(totalLostDays * 10) / 10,
      effectiveWeeks,
      nominalWeeks,
    };
  }

  /**
   * Compute a 0-10 score representing how much calendar events affect teaching.
   * 10 = no impact (clean calendar), 0 = maximum disruption.
   */
  computeCalendarImpactScore(calendar: SchoolCalendar): CalendarImpactScoreResult {
    if (calendar.terms.length === 0) {
      return { score: 10, breakdown: { termScores: [], eventDensity: 0, overlapPenalty: 0 } };
    }

    const events = calendar.events;
    const termScores: { trimester: number; score: number }[] = [];
    let totalNominalWeeks = 0;
    let totalEffectiveWeeks = 0;

    for (const term of calendar.terms) {
      const impact = this.analyzeTermImpact(term, events);
      totalNominalWeeks += impact.nominalWeeks;
      totalEffectiveWeeks += impact.effectiveWeeks;

      // Per-term score: ratio of effective/nominal weeks * 10
      const termScore = impact.nominalWeeks > 0
        ? Math.round((impact.effectiveWeeks / impact.nominalWeeks) * 100) / 10
        : 10;
      termScores.push({ trimester: term.trimester, score: Math.min(10, termScore) });
    }

    // Event density: events per nominal week (penalize if > 0.5 events/week)
    const eventDensity = totalNominalWeeks > 0 ? events.length / totalNominalWeeks : 0;
    const densityPenalty = Math.min(2, Math.max(0, (eventDensity - 0.3) * 3));

    // Overlap penalty: exam periods overlapping with holidays
    let overlapPenalty = 0;
    const examEvents = events.filter(e =>
      e.type === CalendarEventType.EXAM_PERIOD || e.type === CalendarEventType.MAKEUP_EXAM,
    );
    const holidayEvents = events.filter(e =>
      e.type === CalendarEventType.NATIONAL_HOLIDAY || e.type === CalendarEventType.SCHOOL_HOLIDAY,
    );
    for (const exam of examEvents) {
      for (const holiday of holidayEvents) {
        const eStart = toUTC(exam.startDate);
        const eEnd = toUTC(exam.endDate);
        const hStart = toUTC(holiday.startDate);
        const hEnd = toUTC(holiday.endDate);
        if (hStart <= eEnd && hEnd >= eStart) {
          overlapPenalty += 0.5;
        }
      }
    }
    overlapPenalty = Math.min(2, overlapPenalty);

    // Base score from effective/nominal ratio
    const baseScore = totalNominalWeeks > 0
      ? (totalEffectiveWeeks / totalNominalWeeks) * 10
      : 10;

    const finalScore = Math.max(0, Math.min(10,
      Math.round((baseScore - densityPenalty - overlapPenalty) * 10) / 10,
    ));

    return {
      score: finalScore,
      breakdown: {
        termScores,
        eventDensity: Math.round(eventDensity * 100) / 100,
        overlapPenalty: Math.round(overlapPenalty * 10) / 10,
      },
    };
  }

  /**
   * Simulate the impact of a new event without persisting it.
   * Returns only the delta (weeks whose impact changes).
   */
  simulateEventImpact(
    calendar: SchoolCalendar,
    virtualEvent: Pick<CalendarEvent, 'title' | 'startDate' | 'endDate' | 'type' | 'allDay'>,
  ): SimulationResult {
    const existingEvents = calendar.events;
    const allEvents = [
      ...existingEvents,
      { ...virtualEvent, id: '__virtual__', calendarId: calendar.id, createdAt: new Date() } as CalendarEvent,
    ];

    const affectedWeeks: { weekNumber: number; trimester: number; impact: WeekImpact }[] = [];
    let totalLessonReduction = 0;

    for (const term of calendar.terms) {
      const termStart = toUTC(term.startDate);
      const termEnd = toUTC(term.endDate);

      let monday = getMondayOfWeek(termStart);
      if (monday < termStart) monday = termStart;

      let weekNum = 0;
      while (monday <= termEnd) {
        weekNum++;
        const friday = new Date(monday);
        friday.setUTCDate(monday.getUTCDate() + 4);
        const weekEnd = friday > termEnd ? termEnd : friday;

        const before = this.analyzeWeekImpact(monday, weekEnd, existingEvents);
        const after = this.analyzeWeekImpact(monday, weekEnd, allEvents);

        if (after.lessonReduction !== before.lessonReduction) {
          affectedWeeks.push({
            weekNumber: weekNum,
            trimester: term.trimester,
            impact: after,
          });
          totalLessonReduction += after.lessonReduction - before.lessonReduction;
        }

        monday = new Date(monday);
        monday.setUTCDate(monday.getUTCDate() + 7);
      }
    }

    totalLessonReduction = Math.round(totalLessonReduction * 100) / 100;

    const vStart = toUTC(virtualEvent.startDate);
    const vEnd = toUTC(virtualEvent.endDate);
    const msg = affectedWeeks.length === 0
      ? 'Este evento não afecta nenhuma semana lectiva.'
      : `Evento de ${formatDatePT(vStart)} a ${formatDatePT(vEnd)} afecta ${affectedWeeks.length} semana(s) lectiva(s).`;

    return {
      affectedWeeks,
      totalLessonReduction,
      message: msg,
    };
  }
}
