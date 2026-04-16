import { CalendarImpactService } from './calendar-impact.service';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { PlanContent } from '@/src/domain/entities/plan.entity';
import { CalendarEvent, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import {
  toUTC,
  getMondayOfWeek,
  buildWeekRanges,
  parsePeriodPT,
  modalValue,
} from '@/src/shared/utils/calendar-dates';

// ─── Types ───────────────────────────────────────────────

export interface PlanCalendarValidationIssue {
  weekNumber: number;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface PlanCalendarValidationResult {
  isValid: boolean;
  score: number; // 0-10
  issues: PlanCalendarValidationIssue[];
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Check if text contains revision-related keywords.
 */
function hasRevisionKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('revisão') || lower.includes('revisao') || lower.includes('review');
}

/**
 * Convert CalendarContext events (string dates, string type) to CalendarEvent objects.
 */
function toCalendarEvents(
  contextEvents: CalendarContext['events'],
): CalendarEvent[] {
  return contextEvents.map((evt, idx) => ({
    id: `ctx-evt-${idx}`,
    calendarId: '',
    title: evt.title,
    startDate: new Date(evt.startDate),
    endDate: new Date(evt.endDate),
    type: evt.type as CalendarEventType,
    allDay: true,
    createdAt: new Date(),
  }));
}

// ─── Service ─────────────────────────────────────────────

export class PlanCalendarValidationService {
  constructor(private readonly impactService: CalendarImpactService) {}

  validatePlanAgainstCalendar(
    content: PlanContent,
    calendarContext: CalendarContext,
    trimester?: number,
  ): PlanCalendarValidationResult {
    const weeklyPlan = content.weeklyPlan;

    // 1. Nothing to validate
    if (!weeklyPlan || weeklyPlan.length === 0) {
      return { isValid: true, score: 10, issues: [] };
    }

    // 2. Find the relevant term
    const term = trimester != null
      ? calendarContext.terms.find((t) => t.trimester === trimester)
      : calendarContext.terms[0];

    if (!term) {
      return { isValid: true, score: 10, issues: [] };
    }

    // 3. Build week-by-week date ranges from term
    const termStart = toUTC(new Date(term.startDate));
    const termEnd = toUTC(new Date(term.endDate));
    const weekRanges = buildWeekRanges(termStart, termEnd);

    // 4. Convert context events to CalendarEvent objects
    const calendarEvents = toCalendarEvents(calendarContext.events);

    // 5. Compute modal numLessons
    const modalLessons = modalValue(weeklyPlan.map((w) => w.numLessons));

    // 6. Analyze each week and collect issues
    const issues: PlanCalendarValidationIssue[] = [];

    for (let i = 0; i < weeklyPlan.length; i++) {
      const weekItem = weeklyPlan[i];
      const weekNumber = i + 1;

      // Map week to a calendar range — try period first, fall back to index
      let weekStart: Date;
      let weekEnd: Date;

      if (weekItem.period) {
        const parsed = parsePeriodPT(weekItem.period);
        if (parsed) {
          weekStart = parsed.start;
          weekEnd = parsed.end;
        } else if (i < weekRanges.length) {
          weekStart = weekRanges[i].start;
          weekEnd = weekRanges[i].end;
        } else {
          continue;
        }
      } else if (i < weekRanges.length) {
        weekStart = weekRanges[i].start;
        weekEnd = weekRanges[i].end;
      } else {
        continue;
      }

      // 6a. Get impact from CalendarImpactService
      const impact = this.impactService.analyzeWeekImpact(
        weekStart,
        weekEnd,
        calendarEvents,
      );

      // 7. Apply validation rules

      // LESSONS_DURING_BREAK
      if (impact.hasBreak && weekItem.numLessons > 0) {
        issues.push({
          weekNumber,
          severity: 'error',
          code: 'LESSONS_DURING_BREAK',
          message: `Semana ${weekNumber} está em período de férias mas tem ${weekItem.numLessons} aula(s) atribuída(s)`,
        });
      }

      // LESSONS_DURING_HOLIDAY
      if (impact.lessonReduction >= 1.0 && weekItem.numLessons > 0 && !impact.hasBreak) {
        issues.push({
          weekNumber,
          severity: 'error',
          code: 'LESSONS_DURING_HOLIDAY',
          message: `Semana ${weekNumber} tem redução total de aulas mas mantém ${weekItem.numLessons} aula(s)`,
        });
      }

      // NO_REDUCTION_ON_HOLIDAY
      if (
        impact.hasHoliday &&
        impact.lessonReduction > 0 &&
        impact.lessonReduction < 1.0 &&
        weekItem.numLessons === modalLessons
      ) {
        issues.push({
          weekNumber,
          severity: 'warning',
          code: 'NO_REDUCTION_ON_HOLIDAY',
          message: `Semana ${weekNumber} tem feriado mas mantém carga completa`,
        });
      }

      // NO_REVIEW_BEFORE_EXAM
      if (impact.hasExam) {
        const currentHasReview =
          hasRevisionKeyword(weekItem.objectives) ||
          hasRevisionKeyword(weekItem.contents);

        const previousWeek = i > 0 ? weeklyPlan[i - 1] : null;
        const previousHasReview = previousWeek
          ? hasRevisionKeyword(previousWeek.objectives) ||
            hasRevisionKeyword(previousWeek.contents)
          : false;

        if (!currentHasReview && !previousHasReview) {
          issues.push({
            weekNumber,
            severity: 'warning',
            code: 'NO_REVIEW_BEFORE_EXAM',
            message: `Semana ${weekNumber} tem avaliação mas não há revisão nesta semana nem na anterior`,
          });
        }
      }

      // PEDAGOGICAL_WITH_LESSONS
      if (
        impact.hasPedagogicalActivity &&
        impact.lessonReduction >= 1.0 &&
        weekItem.numLessons > 0
      ) {
        issues.push({
          weekNumber,
          severity: 'warning',
          code: 'PEDAGOGICAL_WITH_LESSONS',
          message: `Semana ${weekNumber} tem jornada pedagógica com redução total mas mantém ${weekItem.numLessons} aula(s)`,
        });
      }
    }

    // 8. Compute score
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, 10 - errorCount * 2 - warningCount * 1);

    // 9. isValid = no errors
    const isValid = errorCount === 0;

    return { isValid, score, issues };
  }
}
