import { AIExplanationService } from '@/src/ai/services/ai-explanation.service';
import { Plan, PlanType, PlanStatus, PlanQualityScores } from '@/src/domain/entities/plan.entity';
import { TeachingHistoryContext } from '@/src/ai/services/teaching-history.service';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

describe('AIExplanationService', () => {
  let service: AIExplanationService;

  beforeEach(() => {
    service = new AIExplanationService();
  });

  function makePlan(overrides: Partial<Plan> = {}): Plan {
    return {
      id: 'plan-1',
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      title: 'Plano Trimestral Matemática',
      type: PlanType.TRIMESTER,
      subject: 'Matemática',
      grade: '7ª Classe',
      academicYear: '2025/2026',
      trimester: 1,
      status: PlanStatus.GENERATED,
      content: {
        generalObjectives: ['Obj 1'],
        specificObjectives: ['Spec 1'],
        topics: [{ title: 'Frações', subtopics: [] }],
        weeklyPlan: [
          { week: '1', unit: 'U1', objectives: 'Obj', contents: 'Frações', numLessons: 2 },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Plan;
  }

  it('returns explanation and factors', () => {
    const plan = makePlan();
    const result = service.explain(plan);
    expect(result.explanation).toBeTruthy();
    expect(result.factors).toBeInstanceOf(Array);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('identifies parent_plan factor as active when parent exists', () => {
    const plan = makePlan({ parentPlanId: 'parent-1' });
    const parent = makePlan({ id: 'parent-1', title: 'Plano Anual' });
    const result = service.explain(plan, parent);
    const parentFactor = result.factors.find(f => f.id === 'parent_plan');
    expect(parentFactor?.active).toBe(true);
    expect(parentFactor?.detail).toContain('Plano Anual');
  });

  it('identifies parent_plan factor as inactive when no parent', () => {
    const plan = makePlan();
    const result = service.explain(plan);
    const parentFactor = result.factors.find(f => f.id === 'parent_plan');
    expect(parentFactor?.active).toBe(false);
  });

  it('identifies school_calendar factor when calendar provided', () => {
    const plan = makePlan();
    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-15', teachingWeeks: 13 }],
      events: [{ title: 'Natal', startDate: '2025-12-20', endDate: '2026-01-05', type: 'holiday' }],
    };
    const result = service.explain(plan, undefined, undefined, calendar);
    const calFactor = result.factors.find(f => f.id === 'school_calendar');
    expect(calFactor?.active).toBe(true);
    expect(calFactor?.detail).toContain('1 trimestre');
  });

  it('identifies teaching_history factor when history provided', () => {
    const plan = makePlan();
    const history: TeachingHistoryContext = {
      totalLessonsDelivered: 10,
      totalLessonsPartial: 2,
      totalLessonsSkipped: 1,
      completedTopics: ['Números'],
      delayedTopics: [],
      difficultTopics: [],
      skippedTopics: [],
      averageLessonDuration: 1.1,
    };
    const result = service.explain(plan, undefined, history);
    const histFactor = result.factors.find(f => f.id === 'teaching_history');
    expect(histFactor?.active).toBe(true);
    expect(histFactor?.detail).toContain('10 aula(s)');
  });

  it('identifies difficulty_detection when difficult topics exist', () => {
    const plan = makePlan();
    const history: TeachingHistoryContext = {
      totalLessonsDelivered: 5,
      totalLessonsPartial: 0,
      totalLessonsSkipped: 0,
      completedTopics: [],
      delayedTopics: [],
      difficultTopics: ['Frações', 'Álgebra'],
      skippedTopics: [],
      averageLessonDuration: 1.0,
    };
    const result = service.explain(plan, undefined, history);
    const diffFactor = result.factors.find(f => f.id === 'difficulty_detection');
    expect(diffFactor?.active).toBe(true);
    expect(diffFactor?.detail).toContain('Frações');
  });

  it('includes quality score in explanation when provided', () => {
    const plan = makePlan();
    const quality: PlanQualityScores = {
      coherenceScore: 9,
      workloadBalanceScore: 8,
      calendarAlignmentScore: 9,
      overallScore: 9,
      qualityLabel: 'excellent',
      evaluatedAt: new Date().toISOString(),
    };
    const result = service.explain(plan, undefined, undefined, undefined, quality);
    expect(result.explanation).toContain('9/10');
  });

  it('mentions slow pacing in explanation when duration is high', () => {
    const plan = makePlan();
    const history: TeachingHistoryContext = {
      totalLessonsDelivered: 10,
      totalLessonsPartial: 0,
      totalLessonsSkipped: 0,
      completedTopics: [],
      delayedTopics: [],
      difficultTopics: [],
      skippedTopics: [],
      averageLessonDuration: 1.3,
    };
    const result = service.explain(plan, undefined, history);
    expect(result.explanation).toContain('ritmo foi reduzido');
  });

  it('mentions skipped topics redistribution in explanation', () => {
    const plan = makePlan();
    const history: TeachingHistoryContext = {
      totalLessonsDelivered: 5,
      totalLessonsPartial: 0,
      totalLessonsSkipped: 2,
      completedTopics: [],
      delayedTopics: [],
      difficultTopics: [],
      skippedTopics: ['Geometria'],
      averageLessonDuration: 1.0,
    };
    const result = service.explain(plan, undefined, history);
    expect(result.explanation).toContain('redistribuídos');
  });

  it('marks sibling_awareness active for trimester plans', () => {
    const plan = makePlan({ type: PlanType.TRIMESTER });
    const result = service.explain(plan);
    const sibFactor = result.factors.find(f => f.id === 'sibling_awareness');
    expect(sibFactor?.active).toBe(true);
  });

  it('marks sibling_awareness inactive for annual plans', () => {
    const plan = makePlan({ type: PlanType.ANNUAL });
    const result = service.explain(plan);
    const sibFactor = result.factors.find(f => f.id === 'sibling_awareness');
    expect(sibFactor?.active).toBe(false);
  });
});
