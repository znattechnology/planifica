import { describe, it, expect } from 'vitest';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { PlanCalendarValidationService } from '@/src/domain/services/plan-calendar-validation.service';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import type { PlanContent, WeeklyPlanItem } from '@/src/domain/entities/plan.entity';

function makeWeek(overrides: Partial<WeeklyPlanItem> & { period: string; numLessons: number }): WeeklyPlanItem {
  return {
    week: '1a',
    unit: 'I',
    objectives: 'Objectivo generico',
    contents: 'Conteudo generico',
    ...overrides,
  };
}

function makeContent(weeklyPlan: WeeklyPlanItem[]): PlanContent {
  return {
    generalObjectives: [],
    specificObjectives: [],
    competencies: [],
    topics: [],
    weeklyPlan,
  };
}

const calendarContext: CalendarContext = {
  terms: [
    {
      trimester: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-28',
      teachingWeeks: 12,
    },
  ],
  events: [
    { title: 'Feriado Nacional', startDate: '2025-09-15', endDate: '2025-09-15', type: 'NATIONAL_HOLIDAY' },
    { title: 'Ferias', startDate: '2025-10-20', endDate: '2025-10-24', type: 'TRIMESTER_BREAK' },
    { title: 'Provas', startDate: '2025-11-17', endDate: '2025-11-21', type: 'EXAM_PERIOD' },
  ],
};

describe('PlanCalendarValidationService', () => {
  const impactService = new CalendarImpactService();
  const service = new PlanCalendarValidationService(impactService);

  it('should return score 10 and no issues for a valid plan with no conflicts', () => {
    // Week 1: Sep 1-5 — no events
    const content = makeContent([
      makeWeek({ week: '1a', period: '01/09 A 05/09/2025', numLessons: 2 }),
      makeWeek({ week: '2a', period: '08/09 A 12/09/2025', numLessons: 2 }),
    ]);

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.isValid).toBe(true);
    expect(result.score).toBe(10);
    expect(result.issues).toHaveLength(0);
  });

  it('should report LESSONS_DURING_BREAK when week falls on a break with lessons > 0', () => {
    // Week of Oct 20-24 is TRIMESTER_BREAK
    const content = makeContent([
      makeWeek({ week: '8a', period: '20/10 A 24/10/2025', numLessons: 2 }),
    ]);

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'LESSONS_DURING_BREAK')).toBe(true);
    const issue = result.issues.find(i => i.code === 'LESSONS_DURING_BREAK')!;
    expect(issue.severity).toBe('error');
  });

  it('should report NO_REDUCTION_ON_HOLIDAY when week has holiday but full lesson count', () => {
    // Week of Sep 15-19 has a NATIONAL_HOLIDAY on Sep 15 (Monday)
    // Modal numLessons = 2, and this week also has 2 → no reduction
    const content = makeContent([
      makeWeek({ week: '1a', period: '01/09 A 05/09/2025', numLessons: 2 }),
      makeWeek({ week: '2a', period: '08/09 A 12/09/2025', numLessons: 2 }),
      makeWeek({ week: '3a', period: '15/09 A 19/09/2025', numLessons: 2 }),
      makeWeek({ week: '4a', period: '22/09 A 26/09/2025', numLessons: 2 }),
    ]);

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.issues.some(i => i.code === 'NO_REDUCTION_ON_HOLIDAY')).toBe(true);
    const issue = result.issues.find(i => i.code === 'NO_REDUCTION_ON_HOLIDAY')!;
    expect(issue.severity).toBe('warning');
  });

  it('should report NO_REVIEW_BEFORE_EXAM when exam week has no revision keywords', () => {
    // Week of Nov 17-21 is EXAM_PERIOD
    const content = makeContent([
      makeWeek({ week: '10a', period: '10/11 A 14/11/2025', numLessons: 2, objectives: 'Algebra', contents: 'Equacoes' }),
      makeWeek({ week: '11a', period: '17/11 A 21/11/2025', numLessons: 2, objectives: 'Algebra avancada', contents: 'Funcoes' }),
    ]);

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.issues.some(i => i.code === 'NO_REVIEW_BEFORE_EXAM')).toBe(true);
    const issue = result.issues.find(i => i.code === 'NO_REVIEW_BEFORE_EXAM')!;
    expect(issue.severity).toBe('warning');
  });

  it('should return valid with score 10 when content has no weekly plan', () => {
    const content: PlanContent = {
      generalObjectives: [],
      specificObjectives: [],
      competencies: [],
      topics: [],
      weeklyPlan: [],
    };

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.isValid).toBe(true);
    expect(result.score).toBe(10);
    expect(result.issues).toHaveLength(0);
  });

  it('should decrement score correctly when multiple issues exist', () => {
    // Break week with lessons (error, -2) + exam week without revision (warning, -1)
    const content = makeContent([
      makeWeek({ week: '1a', period: '01/09 A 05/09/2025', numLessons: 2 }),
      makeWeek({ week: '8a', period: '20/10 A 24/10/2025', numLessons: 2 }), // break → error
      makeWeek({ week: '10a', period: '10/11 A 14/11/2025', numLessons: 2, objectives: 'Algebra', contents: 'Funcoes' }),
      makeWeek({ week: '11a', period: '17/11 A 21/11/2025', numLessons: 2, objectives: 'Algebra', contents: 'Funcoes' }), // exam → warning
    ]);

    const result = service.validatePlanAgainstCalendar(content, calendarContext, 1);

    expect(result.isValid).toBe(false);
    const errorCount = result.issues.filter(i => i.severity === 'error').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    expect(errorCount).toBeGreaterThanOrEqual(1);
    expect(warningCount).toBeGreaterThanOrEqual(1);
    // Score = 10 - errors*2 - warnings*1
    expect(result.score).toBe(10 - errorCount * 2 - warningCount * 1);
  });
});
