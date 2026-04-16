import { CalendarImpactService, WeekImpact } from './calendar-impact.service';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { CalendarEvent, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { toUTC, buildWeekRanges } from '@/src/shared/utils/calendar-dates';

// ─── Types ───────────────────────────────────────────────

export interface AdjustedWeekTemplate {
  weekNumber: number;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  baseLessons: number;
  adjustedLessons: number;
  isNonTeaching: boolean;
  isReviewWeek: boolean;  // week before an exam — include revision content
  isExamWeek: boolean;    // exam/assessment week — no new content
  impactSummary: string;
}

export interface WorkloadAdjustmentResult {
  weeks: AdjustedWeekTemplate[];
  totalAdjustedLessons: number;
  totalNonTeachingWeeks: number;
}

/**
 * Convert CalendarContext events (string dates, string type) to CalendarEvent entities.
 */
function contextEventsToEntities(
  events: CalendarContext['events'],
): CalendarEvent[] {
  return events.map((e, index) => ({
    id: `ctx_${index}`,
    calendarId: '',
    title: e.title,
    startDate: toUTC(e.startDate),
    endDate: toUTC(e.endDate),
    type: e.type as CalendarEventType,
    allDay: true,
    createdAt: new Date(),
  }));
}

// ─── Service ─────────────────────────────────────────────

export class WorkloadAdjustmentService {
  constructor(private readonly impactService: CalendarImpactService) {}

  /**
   * Deterministically adjust weekly lesson counts for a trimester based on
   * calendar events. Runs BEFORE sending data to the AI so the plan
   * already reflects holidays, breaks, exams, etc.
   *
   * Returns null if the trimester is not found in the calendar context.
   */
  adjustForTrimester(
    calendarContext: CalendarContext,
    trimester: number,
    baseLessonsPerWeek: number,
  ): WorkloadAdjustmentResult | null {
    // 1. Find the matching term
    const term = calendarContext.terms.find((t) => t.trimester === trimester);
    if (!term) return null;

    // 2. Convert context events to CalendarEvent entities
    const calendarEvents = contextEventsToEntities(calendarContext.events);

    // 3. Generate Monday-to-Friday week ranges
    const termStart = toUTC(term.startDate);
    const termEnd = toUTC(term.endDate);
    const weekRanges = buildWeekRanges(termStart, termEnd);

    // 4 & 5. Analyze each week and apply deterministic adjustments
    const weeks: AdjustedWeekTemplate[] = [];
    let totalAdjustedLessons = 0;
    let totalNonTeachingWeeks = 0;

    // First pass: build all weeks with their raw impact
    const rawImpacts: { impact: WeekImpact; monday: Date; friday: Date }[] = [];
    for (const { start: monday, end: friday } of weekRanges) {
      const impact = this.impactService.analyzeWeekImpact(monday, friday, calendarEvents);
      rawImpacts.push({ impact, monday, friday });
    }

    // Second pass: build week templates, flagging the week BEFORE an exam week as review
    for (let i = 0; i < rawImpacts.length; i++) {
      const { impact, monday, friday } = rawImpacts[i];

      let adjustedLessons: number;
      let isNonTeaching = false;
      let isReviewWeek = false;

      if (impact.lessonReduction >= 1.0) {
        // Full week lost
        adjustedLessons = 0;
        isNonTeaching = true;
      } else if (impact.lessonReduction > 0) {
        // Partial reduction
        adjustedLessons = Math.max(
          0,
          Math.round(baseLessonsPerWeek * (1 - impact.lessonReduction)),
        );
        isNonTeaching = false;
      } else {
        // No reduction
        adjustedLessons = baseLessonsPerWeek;
      }

      // Flag the week BEFORE an exam as review (not the exam week itself)
      const nextWeekHasExam = i + 1 < rawImpacts.length && rawImpacts[i + 1].impact.hasExam;
      if (nextWeekHasExam && !impact.hasExam && !impact.hasBreak) {
        isReviewWeek = true;
      }

      const isExamWeek = impact.hasExam;

      // Build impact summary
      let impactSummary = impact.message || '';
      if (isExamWeek) {
        impactSummary = impactSummary || 'Época de avaliação — sem conteúdos novos';
      }

      const weekTemplate: AdjustedWeekTemplate = {
        weekNumber: i + 1,
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: friday.toISOString().split('T')[0],
        baseLessons: baseLessonsPerWeek,
        adjustedLessons,
        isNonTeaching,
        isReviewWeek,
        isExamWeek,
        impactSummary,
      };

      weeks.push(weekTemplate);

      // Sum up totals
      totalAdjustedLessons += adjustedLessons;
      if (isNonTeaching) totalNonTeachingWeeks++;
    }

    return {
      weeks,
      totalAdjustedLessons,
      totalNonTeachingWeeks,
    };
  }
}
