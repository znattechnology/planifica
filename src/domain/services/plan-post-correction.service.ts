import { PlanContent, WeeklyPlanItem } from '@/src/domain/entities/plan.entity';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { CalendarImpactService } from './calendar-impact.service';
import { SequenceViolation } from './curriculum-intelligence.service';
import { CalendarEvent, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import {
  toUTC,
  buildWeekRanges,
  parsePeriodPT,
  modalValue,
} from '@/src/shared/utils/calendar-dates';

// ─── Types ───────────────────────────────────────────────

export interface CorrectionAction {
  weekNumber: number;
  type:
    | 'ZEROED_HOLIDAY_LESSONS'
    | 'ZEROED_BREAK_LESSONS'
    | 'REDUCED_PARTIAL_HOLIDAY'
    | 'INSERTED_REVIEW_WEEK'
    | 'REBALANCED_OVERLOAD'
    | 'REDISTRIBUTED_CONTENT'
    | 'TRIMMED_EXCESS_WEEKS'
    | 'FILLED_EMPTY_WEEK'
    | 'SWAPPED_PREREQUISITE_ORDER';
  before: Partial<WeeklyPlanItem>;
  after: Partial<WeeklyPlanItem>;
  reason: string;
}

export interface PostCorrectionResult {
  corrected: boolean;
  content: PlanContent;
  actions: CorrectionAction[];
  /** Score improvement from corrections */
  scoreDelta: number;
}

// ─── Helpers ────────────────────────────────────────────

function toCalendarEvents(contextEvents: CalendarContext['events']): CalendarEvent[] {
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

function hasRevisionKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('revisão') || lower.includes('revisao') || lower.includes('review')
    || lower.includes('consolidação') || lower.includes('consolidacao') || lower.includes('preparação');
}

// ─── Service ────────────────────────────────────────────

/**
 * Deterministic Post-Correction Engine.
 *
 * Runs AFTER AI generation and AFTER validation.
 * Unlike validation (which only detects issues), this service FIXES them.
 *
 * Corrections are applied at week-level granularity with full audit trail.
 * Each correction records before/after state and reason.
 *
 * Pipeline position:
 *   AI Generation → Validation → ★ Post-Correction ★ → Quality Scoring → Save
 */
export class PlanPostCorrectionService {
  constructor(private readonly impactService: CalendarImpactService) {}

  /**
   * Apply deterministic corrections to AI-generated plan content.
   * Returns a corrected copy — never mutates the input.
   */
  correct(
    content: PlanContent,
    calendarContext: CalendarContext,
    trimester?: number,
    baseLessonsPerWeek?: number,
    sequenceViolations?: SequenceViolation[],
  ): PostCorrectionResult {
    const actions: CorrectionAction[] = [];

    if (!content.weeklyPlan || content.weeklyPlan.length === 0) {
      return { corrected: false, content, actions, scoreDelta: 0 };
    }

    // Deep clone to avoid mutation
    const corrected: PlanContent = {
      ...content,
      weeklyPlan: content.weeklyPlan.map(w => ({ ...w })),
    };
    const weeklyPlan = corrected.weeklyPlan!;

    // Resolve calendar data
    const term = trimester != null
      ? calendarContext.terms.find(t => t.trimester === trimester)
      : calendarContext.terms[0];

    if (!term) {
      return { corrected: false, content, actions, scoreDelta: 0 };
    }

    const termStart = toUTC(new Date(term.startDate));
    const termEnd = toUTC(new Date(term.endDate));
    const weekRanges = buildWeekRanges(termStart, termEnd);
    const calendarEvents = toCalendarEvents(calendarContext.events);
    const modal = modalValue(weeklyPlan.map(w => w.numLessons));
    const basePerWeek = baseLessonsPerWeek || modal || 2;

    // ─── Pass 1: Calendar compliance (zero out holidays/breaks) ───

    for (let i = 0; i < weeklyPlan.length; i++) {
      const week = weeklyPlan[i];

      // Resolve week date range
      let weekStart: Date;
      let weekEnd: Date;
      if (week.period) {
        const parsed = parsePeriodPT(week.period);
        if (parsed) {
          weekStart = parsed.start;
          weekEnd = parsed.end;
        } else if (i < weekRanges.length) {
          weekStart = weekRanges[i].start;
          weekEnd = weekRanges[i].end;
        } else continue;
      } else if (i < weekRanges.length) {
        weekStart = weekRanges[i].start;
        weekEnd = weekRanges[i].end;
      } else continue;

      const impact = this.impactService.analyzeWeekImpact(weekStart, weekEnd, calendarEvents);

      // Correction 1: Full break — zero out lessons, redistribute content
      if (impact.hasBreak && week.numLessons > 0) {
        const displacedObjectives = week.objectives;
        const displacedContents = week.contents;

        actions.push({
          weekNumber: i + 1,
          type: 'ZEROED_BREAK_LESSONS',
          before: { numLessons: week.numLessons, objectives: week.objectives },
          after: { numLessons: 0, objectives: '(Semana de férias — sem aulas)' },
          reason: `Semana ${i + 1} é período de férias. ${week.numLessons} aula(s) removida(s).`,
        });
        week.numLessons = 0;
        week.objectives = '(Semana de férias — sem aulas)';
        week.contents = '';

        // Push displaced content to the next teaching week
        this.redistributeContent(weeklyPlan, i, displacedObjectives, displacedContents, actions);
      }

      // Correction 2: Full holiday reduction — zero out, redistribute content
      if (!impact.hasBreak && impact.lessonReduction >= 1.0 && week.numLessons > 0) {
        const displacedObjectives = week.objectives;
        const displacedContents = week.contents;

        actions.push({
          weekNumber: i + 1,
          type: 'ZEROED_HOLIDAY_LESSONS',
          before: { numLessons: week.numLessons },
          after: { numLessons: 0 },
          reason: `Semana ${i + 1} tem redução total por feriado/actividade. ${week.numLessons} aula(s) removida(s).`,
        });
        week.numLessons = 0;

        this.redistributeContent(weeklyPlan, i, displacedObjectives, displacedContents, actions);
      }

      // Correction 3: Partial holiday — reduce proportionally
      if (
        !impact.hasBreak &&
        impact.hasHoliday &&
        impact.lessonReduction > 0 &&
        impact.lessonReduction < 1.0 &&
        week.numLessons === basePerWeek
      ) {
        const adjusted = Math.max(1, Math.round(basePerWeek * (1 - impact.lessonReduction)));
        if (adjusted < week.numLessons) {
          actions.push({
            weekNumber: i + 1,
            type: 'REDUCED_PARTIAL_HOLIDAY',
            before: { numLessons: week.numLessons },
            after: { numLessons: adjusted },
            reason: `Semana ${i + 1} tem feriado (redução ${Math.round(impact.lessonReduction * 100)}%). Aulas: ${week.numLessons} → ${adjusted}.`,
          });
          week.numLessons = adjusted;
        }
      }
    }

    // ─── Pass 2: Insert review before exam weeks ───

    for (let i = 0; i < weeklyPlan.length; i++) {
      const week = weeklyPlan[i];

      // Resolve impact for this week
      let weekStart: Date;
      let weekEnd: Date;
      if (i < weekRanges.length) {
        weekStart = weekRanges[i].start;
        weekEnd = weekRanges[i].end;
      } else continue;

      const impact = this.impactService.analyzeWeekImpact(weekStart, weekEnd, calendarEvents);

      if (impact.hasExam) {
        // Check if current week or previous week has review
        const currentHasReview = hasRevisionKeyword(week.objectives) || hasRevisionKeyword(week.contents);
        const prevWeek = i > 0 ? weeklyPlan[i - 1] : null;
        const prevHasReview = prevWeek
          ? hasRevisionKeyword(prevWeek.objectives) || hasRevisionKeyword(prevWeek.contents)
          : false;

        if (!currentHasReview && !prevHasReview && prevWeek && prevWeek.numLessons > 0) {
          // Inject review into previous week — both objectives AND contents so teachers
          // using either field see the review note (audit M6: contents was previously skipped).
          const originalObjectives = prevWeek.objectives;
          const originalContents = prevWeek.contents;
          const reviewObjective = `${originalObjectives}\n\n[Revisão] Preparação para avaliação da semana seguinte.`;
          const reviewContents = originalContents
            ? `${originalContents}\n[Revisão] Rever os conteúdos das semanas anteriores em preparação para a avaliação.`
            : '[Revisão] Rever os conteúdos das semanas anteriores em preparação para a avaliação.';
          actions.push({
            weekNumber: i, // previous week number (1-based)
            type: 'INSERTED_REVIEW_WEEK',
            before: { objectives: originalObjectives, contents: originalContents },
            after: { objectives: reviewObjective, contents: reviewContents },
            reason: `Semana ${i + 1} tem avaliação. Revisão inserida na semana ${i}.`,
          });
          prevWeek.objectives = reviewObjective;
          prevWeek.contents = reviewContents;
        }
      }
    }

    // ─── Pass 3: Rebalance overloaded weeks ───

    const teachingWeeks = weeklyPlan.filter(w => w.numLessons > 0);
    if (teachingWeeks.length >= 3) {
      const avg = teachingWeeks.reduce((s, w) => s + w.numLessons, 0) / teachingWeeks.length;
      const overloadThreshold = avg * 1.5;

      for (let i = 0; i < weeklyPlan.length; i++) {
        const week = weeklyPlan[i];
        if (week.numLessons > overloadThreshold && week.numLessons > basePerWeek) {
          // Find the nearest underloaded week
          let targetIdx = -1;
          for (let j = i + 1; j < weeklyPlan.length; j++) {
            if (weeklyPlan[j].numLessons > 0 && weeklyPlan[j].numLessons < basePerWeek) {
              targetIdx = j;
              break;
            }
          }

          if (targetIdx >= 0) {
            const excess = week.numLessons - basePerWeek;
            const deficit = basePerWeek - weeklyPlan[targetIdx].numLessons;
            const transfer = Math.min(excess, deficit);

            actions.push({
              weekNumber: i + 1,
              type: 'REBALANCED_OVERLOAD',
              before: { numLessons: week.numLessons },
              after: { numLessons: week.numLessons - transfer },
              reason: `Semana ${i + 1} sobrecarregada (${week.numLessons} aulas). ${transfer} aula(s) transferida(s) para semana ${targetIdx + 1}.`,
            });

            week.numLessons -= transfer;
            weeklyPlan[targetIdx].numLessons += transfer;
          }
        }
      }
    }

    // ─── Pass 4: Trim excess weeks beyond calendar ───

    const expectedWeeks = calendarContext.effectiveTeachingWeeks || term.teachingWeeks;
    if (weeklyPlan.length > expectedWeeks + 1) {
      const excessCount = weeklyPlan.length - expectedWeeks;
      actions.push({
        weekNumber: expectedWeeks + 1,
        type: 'TRIMMED_EXCESS_WEEKS',
        before: { numLessons: excessCount },
        after: { numLessons: 0 },
        reason: `Plano tinha ${weeklyPlan.length} semanas mas calendário tem ${expectedWeeks}. ${excessCount} semana(s) excedente(s) removida(s).`,
      });
      corrected.weeklyPlan = weeklyPlan.slice(0, expectedWeeks);
    }

    // ─── Pass 5: Fix prerequisite ordering (max 3 swaps, safe) ───

    if (sequenceViolations && sequenceViolations.length > 0) {
      const MAX_SWAPS = 3;
      let swapCount = 0;
      const currentWeekly = corrected.weeklyPlan!;

      // Sort violations: deeper prerequisite chains first (more missing prereqs = deeper).
      // This ensures A→B→C chains are fixed starting from A, preventing cascading breaks.
      const sortedViolations = [...sequenceViolations]
        .filter(v => v.severity === 'error') // only cross-unit errors
        .sort((a, b) => b.missingPrerequisites.length - a.missingPrerequisites.length);

      // Track which weeks have been swapped to avoid double-swapping
      const swappedWeeks = new Set<number>();

      for (const violation of sortedViolations) {
        if (swapCount >= MAX_SWAPS) break;

        const dependentWeekIdx = violation.weekNumber - 1; // 0-based
        if (dependentWeekIdx < 0 || dependentWeekIdx >= currentWeekly.length) continue;
        if (swappedWeeks.has(dependentWeekIdx)) continue; // already modified

        // Find the latest prerequisite's week in the plan
        let latestPrereqWeekIdx = -1;
        for (const prereq of violation.missingPrerequisites) {
          const prereqContent = prereq.content.toLowerCase().trim();
          for (let w = 0; w < currentWeekly.length; w++) {
            const weekContent = (currentWeekly[w].contents || '').toLowerCase();
            if (weekContent.includes(prereqContent) || prereqContent.includes(weekContent.substring(0, 20))) {
              latestPrereqWeekIdx = Math.max(latestPrereqWeekIdx, w);
            }
          }
        }

        // Skip if prerequisite not found or already in correct order
        if (latestPrereqWeekIdx === -1 || latestPrereqWeekIdx < dependentWeekIdx) continue;

        const targetWeekIdx = Math.min(latestPrereqWeekIdx + 1, currentWeekly.length - 1);
        if (targetWeekIdx === dependentWeekIdx) continue;
        if (swappedWeeks.has(targetWeekIdx)) continue; // target already modified
        if (currentWeekly[targetWeekIdx].numLessons === 0) continue; // non-teaching week

        const depWeek = currentWeekly[dependentWeekIdx];
        const targetWeek = currentWeekly[targetWeekIdx];

        // ★ Workload protection: skip swap if lesson counts differ by more than 1
        if (Math.abs(depWeek.numLessons - targetWeek.numLessons) > 1) continue;

        // Save state for potential rollback
        const depObjectives = depWeek.objectives;
        const depContents = depWeek.contents;
        const targetObjectives = targetWeek.objectives;
        const targetContents = targetWeek.contents;

        // Perform swap
        depWeek.objectives = targetObjectives;
        depWeek.contents = targetContents;
        targetWeek.objectives = depObjectives;
        targetWeek.contents = depContents;

        // ★ Post-swap validation: check that the swap didn't break other prerequisites.
        // A swap is invalid if the moved-to-target content now appears BEFORE its own prereqs.
        let swapCausesNewViolation = false;
        for (const otherViolation of sequenceViolations) {
          if (otherViolation === violation) continue;
          // If another violation's dependent topic was in targetWeek, check if it's now broken
          if (otherViolation.weekNumber - 1 === targetWeekIdx) {
            // The target week now has the dependent's original content — check its prereqs
            for (const prereq of otherViolation.missingPrerequisites) {
              const pContent = prereq.content.toLowerCase().trim();
              // Check if this prereq appears after targetWeekIdx (would be a new violation)
              let prereqAfter = false;
              for (let w = targetWeekIdx + 1; w < currentWeekly.length; w++) {
                if ((currentWeekly[w].contents || '').toLowerCase().includes(pContent)) {
                  prereqAfter = true;
                  break;
                }
              }
              if (prereqAfter) {
                swapCausesNewViolation = true;
                break;
              }
            }
            if (swapCausesNewViolation) break;
          }
        }

        if (swapCausesNewViolation) {
          // ★ Rollback: revert swap — system must NEVER make the plan worse
          depWeek.objectives = depObjectives;
          depWeek.contents = depContents;
          targetWeek.objectives = targetObjectives;
          targetWeek.contents = targetContents;
          continue;
        }

        // Swap accepted — record it
        swappedWeeks.add(dependentWeekIdx);
        swappedWeeks.add(targetWeekIdx);

        actions.push({
          weekNumber: dependentWeekIdx + 1,
          type: 'SWAPPED_PREREQUISITE_ORDER',
          before: { objectives: depObjectives, contents: depContents },
          after: { objectives: targetObjectives, contents: targetContents },
          reason: `Semana ${dependentWeekIdx + 1} ↔ Semana ${targetWeekIdx + 1}: conteúdo reordenado para respeitar pré-requisitos.`,
        });

        swapCount++;
      }
    }

    // ─── Update totals ───

    const finalWeekly = corrected.weeklyPlan!;
    corrected.totalWeeks = finalWeekly.length;
    corrected.totalLessons = finalWeekly.reduce((sum, w) => sum + w.numLessons, 0);

    // ─── Add correction notes ───

    if (actions.length > 0) {
      const correctionNotes = actions.map(a => `[AUTO-FIX] ${a.reason}`).join('\n');
      corrected.criticalNotes = corrected.criticalNotes
        ? `${corrected.criticalNotes}\n\n--- Correcções Automáticas (${actions.length}) ---\n${correctionNotes}`
        : `--- Correcções Automáticas (${actions.length}) ---\n${correctionNotes}`;
    }

    // Estimate score improvement
    const scoreDelta = actions.filter(a =>
      a.type === 'ZEROED_BREAK_LESSONS' || a.type === 'ZEROED_HOLIDAY_LESSONS',
    ).length * 2 + actions.filter(a =>
      a.type === 'INSERTED_REVIEW_WEEK' || a.type === 'REDUCED_PARTIAL_HOLIDAY',
    ).length * 1;

    return {
      corrected: actions.length > 0,
      content: corrected,
      actions,
      scoreDelta: Math.min(scoreDelta, 5),
    };
  }

  /**
   * Push displaced content from a zeroed week to the next available teaching week.
   * Appends to existing content (never overwrites).
   */
  private redistributeContent(
    weeklyPlan: WeeklyPlanItem[],
    zeroedIndex: number,
    objectives: string,
    contents: string,
    actions: CorrectionAction[],
  ): void {
    if (!objectives && !contents) return;

    // Find next week with lessons > 0
    for (let j = zeroedIndex + 1; j < weeklyPlan.length; j++) {
      if (weeklyPlan[j].numLessons > 0) {
        const target = weeklyPlan[j];
        const beforeObjectives = target.objectives;

        // Detect if target week already received redistributed content from a previous zeroed week.
        // Multiple displacements into the same week create content overload with unchanged numLessons.
        const alreadyPiled = (target.objectives || '').includes('[Redistribuído') ||
          (target.contents || '').includes('[Redistribuído');

        if (objectives && objectives !== '(Semana de férias — sem aulas)') {
          target.objectives = target.objectives
            ? `${target.objectives}\n[Redistribuído da semana ${zeroedIndex + 1}] ${objectives}`
            : objectives;
        }
        if (contents) {
          target.contents = target.contents
            ? `${target.contents}\n[Redistribuído da semana ${zeroedIndex + 1}] ${contents}`
            : contents;
        }

        actions.push({
          weekNumber: j + 1,
          type: 'REDISTRIBUTED_CONTENT',
          before: { objectives: beforeObjectives },
          after: { objectives: target.objectives },
          reason: alreadyPiled
            ? `[AVISO] Conteúdo da semana ${zeroedIndex + 1} redistribuído para semana ${j + 1}, que já tem conteúdo redistribuído — risco de sobrecarga lectiva.`
            : `Conteúdo da semana ${zeroedIndex + 1} redistribuído para semana ${j + 1}.`,
        });
        return;
      }
    }
    // No valid week found — explicitly log the content loss so it surfaces in criticalNotes
    actions.push({
      weekNumber: zeroedIndex + 1,
      type: 'REDISTRIBUTED_CONTENT',
      before: { objectives, contents },
      after: { objectives: '', contents: '' },
      reason: `[AVISO] Conteúdo da semana ${zeroedIndex + 1} não pôde ser redistribuído — sem semanas lectivas posteriores disponíveis. Conteúdo perdido.`,
    });
  }
}
