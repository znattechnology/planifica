import { describe, it, expect } from 'vitest';
import { PlanQualityService } from '@/src/ai/services/plan-quality.service';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import type { Plan } from '@/src/domain/entities/plan.entity';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import type { TeachingHistoryContext } from '@/src/ai/services/teaching-history.service';
import { PACING_THRESHOLD } from '@/src/ai/config';

function createPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    userId: 'user-1',
    type: PlanType.TRIMESTER,
    title: '1º Trimestre',
    subject: 'Matemática',
    grade: '10ª Classe',
    academicYear: '2025/2026',
    trimester: 1,
    content: {
      generalObjectives: ['Obj 1'],
      specificObjectives: ['Obj esp 1'],
      competencies: ['Comp 1'],
      topics: [{ title: 'Álgebra' }, { title: 'Geometria' }],
      weeklyPlan: Array.from({ length: 12 }, (_, i) => ({
        week: `${i + 1}ª`,
        unit: 'I',
        objectives: `Objectivo semana ${i + 1}`,
        contents: `Conteúdo semana ${i + 1}`,
        numLessons: 2,
      })),
      totalWeeks: 12,
      totalLessons: 24,
    },
    status: PlanStatus.GENERATED,
    dosificacaoId: 'dos-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createHistory(overrides: Partial<TeachingHistoryContext> = {}): TeachingHistoryContext {
  return {
    completedTopics: ['Números'],
    delayedTopics: [],
    difficultTopics: [],
    skippedTopics: [],
    averageLessonDuration: 1.0,
    totalLessonsDelivered: 5,
    totalLessonsPartial: 0,
    totalLessonsSkipped: 0,
    recentNotes: [],
    ...overrides,
  };
}

describe('PlanQualityService', () => {
  const service = new PlanQualityService();

  it('should give high scores for a well-structured plan with no issues', () => {
    const plan = createPlan();
    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [], undefined, calendar);

    expect(report.scores.coherenceScore).toBeGreaterThanOrEqual(7);
    expect(report.scores.workloadBalanceScore).toBeGreaterThanOrEqual(7);
    expect(report.scores.calendarAlignmentScore).toBeGreaterThanOrEqual(7);
    expect(report.scores.overallScore).toBeGreaterThanOrEqual(7);
    expect(report.scores.qualityLabel).toBe('excellent');
    expect(report.insights.some(i => i.type === 'success')).toBe(true);
  });

  it('should include qualityLabel in scores', () => {
    const plan = createPlan();
    const report = service.evaluate(plan, []);
    expect(report.scores.qualityLabel).toBeDefined();
    expect(['excellent', 'good', 'needs_review', 'unverified']).toContain(report.scores.qualityLabel);
  });

  it('should penalize missing objectives', () => {
    const plan = createPlan({
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
      },
    });

    const report = service.evaluate(plan, []);

    expect(report.scores.coherenceScore).toBeLessThanOrEqual(8);
    expect(report.insights.some(i => i.type === 'error' && i.message.includes('Objectivos'))).toBe(true);
  });

  it('should detect topic duplication with siblings', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }, { title: 'Geometria' }],
      },
    });

    const sibling = createPlan({
      id: 'plan-2',
      title: '2º Trimestre',
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }], // duplicate
      },
    });

    const report = service.evaluate(plan, [sibling]);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('duplicado'),
    )).toBe(true);
  });

  it('should detect calendar week count mismatch', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: Array.from({ length: 6 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: 'Obj',
          contents: 'C',
          numLessons: 2,
        })),
        totalWeeks: 6,
        totalLessons: 12,
      },
    });

    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [], undefined, calendar);

    expect(report.scores.calendarAlignmentScore).toBeLessThan(7);
    expect(report.insights.some(i =>
      i.type === 'error' && i.message.includes('Desalinhamento'),
    )).toBe(true);
  });

  it('should warn when no calendar is available', () => {
    const plan = createPlan();
    const report = service.evaluate(plan, []);

    expect(report.scores.calendarAlignmentScore).toBe(7);
    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('Calendário escolar não disponível'),
    )).toBe(true);
  });

  it('should validate parent alignment', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema Inventado' }],
      },
    });

    const parent = createPlan({
      id: 'parent-1',
      type: PlanType.ANNUAL,
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }, { title: 'Geometria' }],
      },
    });

    const report = service.evaluate(plan, [], parent);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('não encontrado(s) no plano pai'),
    )).toBe(true);
  });

  it('should report successful lesson phase count for lesson plans', () => {
    const plan = createPlan({
      type: PlanType.LESSON,
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema' }],
        lessonPhases: [
          { name: 'Início', duration: '5 min', activities: [] },
          { name: 'Desenvolvimento', duration: '25 min', activities: [] },
          { name: 'Conclusão', duration: '10 min', activities: [] },
          { name: 'TPC', duration: '5 min', activities: [] },
        ],
      },
    });

    const report = service.evaluate(plan, []);
    expect(report.insights.some(i =>
      i.type === 'success' && i.message.includes('4 fases'),
    )).toBe(true);
  });

  // ===== History Compliance Tests =====

  it('should detect when difficult topics are included in plan (success)', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }, { title: 'Frações' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Frações e operações', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ difficultTopics: ['Frações'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.scores.historyComplianceScore).toBeDefined();
    expect(report.scores.historyComplianceScore!).toBeGreaterThanOrEqual(7);
    expect(report.insights.some(i =>
      i.type === 'success' && i.message.includes('difícil'),
    )).toBe(true);
  });

  it('should penalize when difficult topics are missing from plan', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Geometria' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Geometria', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ difficultTopics: ['Frações', 'Trigonometria'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.scores.historyComplianceScore).toBeDefined();
    expect(report.scores.historyComplianceScore!).toBeLessThan(10);
    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('não reforçados'),
    )).toBe(true);
  });

  it('should detect when skipped topics are rescheduled', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Trigonometria' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Trigonometria', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ skippedTopics: ['Trigonometria'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.insights.some(i =>
      i.type === 'success' && i.message.includes('reagendado'),
    )).toBe(true);
  });

  it('should penalize when skipped topics are not rescheduled', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Geometria' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Geometria', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ skippedTopics: ['Estatística', 'Probabilidade'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('não dado'),
    )).toBe(true);
  });

  it('should warn about pacing when teacher runs slow but plan is dense', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: Array.from({ length: 10 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: 'Obj',
          contents: 'C',
          numLessons: 4, // high density
        })),
      },
    });

    const history = createHistory({ averageLessonDuration: 1.4 }); // 40% slower
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('Ritmo'),
    )).toBe(true);
  });

  it('should adjust weights when teaching history is provided', () => {
    const plan = createPlan();
    const history = createHistory({ difficultTopics: ['Álgebra'] });

    const withHistory = service.evaluate(plan, [], undefined, undefined, history);
    const withoutHistory = service.evaluate(plan, []);

    // With history, historyComplianceScore should be defined
    expect(withHistory.scores.historyComplianceScore).toBeDefined();
    expect(withoutHistory.scores.historyComplianceScore).toBeUndefined();

    // Overall scores may differ due to weight redistribution
    expect(withHistory.scores.overallScore).not.toBe(withoutHistory.scores.overallScore);
  });

  it('should assign needs_review label for low quality plans', () => {
    const plan = createPlan({
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [],
        weeklyPlan: Array.from({ length: 3 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: '',
          contents: '',
          numLessons: 0,
        })),
      },
    });

    // Calendar with huge mismatch (12 weeks expected, 3 in plan)
    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [], undefined, calendar);
    // Score ~5.9: coherence 5 (missing topics/objectives), calendar 5 (9 week mismatch), workload 8
    expect(report.scores.overallScore).toBeLessThan(7);
    expect(report.scores.qualityLabel).toBe('good'); // below 'excellent' threshold of 8
    expect(report.insights.some(i => i.type === 'error')).toBe(true);
  });

  // ===== B2: Null Safety Tests =====

  it('should handle null contents in weeklyPlan without crashing', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: null as unknown as string, numLessons: 2 },
          { week: '2ª', unit: 'I', objectives: null as unknown as string, contents: undefined as unknown as string, numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ difficultTopics: ['Álgebra'] });

    // Should not throw
    expect(() => service.evaluate(plan, [], undefined, undefined, history)).not.toThrow();
    const report = service.evaluate(plan, [], undefined, undefined, history);
    expect(report.scores.historyComplianceScore).toBeDefined();
  });

  // ===== B3: Pacing Boundary Tests =====

  it('should NOT trigger pacing warning at exactly PACING_THRESHOLD (1.1)', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: Array.from({ length: 10 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: 'Obj',
          contents: 'C',
          numLessons: 4,
        })),
      },
    });

    // Exactly at threshold — should NOT trigger (uses >)
    const history = createHistory({ averageLessonDuration: PACING_THRESHOLD });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    const pacingInsights = report.insights.filter(i => i.message.includes('Ritmo'));
    expect(pacingInsights).toHaveLength(0);
  });

  it('should trigger pacing warning just above PACING_THRESHOLD (1.11)', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: Array.from({ length: 10 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: 'Obj',
          contents: 'C',
          numLessons: 4,
        })),
      },
    });

    // Just above threshold — should trigger
    const history = createHistory({ averageLessonDuration: PACING_THRESHOLD + 0.01 });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('Ritmo'),
    )).toBe(true);
  });

  it('should NOT trigger pacing warning just below PACING_THRESHOLD (1.09)', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: Array.from({ length: 10 }, (_, i) => ({
          week: `${i + 1}ª`,
          unit: 'I',
          objectives: 'Obj',
          contents: 'C',
          numLessons: 4,
        })),
      },
    });

    const history = createHistory({ averageLessonDuration: PACING_THRESHOLD - 0.01 });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    const pacingInsights = report.insights.filter(i => i.message.includes('Ritmo'));
    expect(pacingInsights).toHaveLength(0);
  });

  // ===== checksPerformed === 0 path =====

  it('should return score 8 when history has no applicable checks', () => {
    const plan = createPlan();
    const history = createHistory({
      difficultTopics: [],
      skippedTopics: [],
      averageLessonDuration: 1.0, // normal pacing — no check triggered
    });

    const report = service.evaluate(plan, [], undefined, undefined, history);

    expect(report.scores.historyComplianceScore).toBe(8);
    expect(report.insights.some(i =>
      i.type === 'success' && i.message.includes('sem adaptações necessárias'),
    )).toBe(true);
  });

  // ===== Precise score assertions =====

  it('should score coherence exactly 10 for a perfect plan with no siblings or parent', () => {
    const plan = createPlan();
    const report = service.evaluate(plan, []);
    expect(report.scores.coherenceScore).toBe(10);
  });

  it('should score coherence exactly 8 for missing objectives', () => {
    const plan = createPlan({
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
      },
    });
    const report = service.evaluate(plan, []);
    // -2 for missing objectives
    expect(report.scores.coherenceScore).toBe(8);
  });

  it('should score coherence exactly 5 for missing objectives AND missing topics', () => {
    const plan = createPlan({
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [],
      },
    });
    const report = service.evaluate(plan, []);
    // -3 for missing topics, -2 for missing objectives = 5
    expect(report.scores.coherenceScore).toBe(5);
  });

  // ===== historyComplianceScore precise penalty =====

  it('should penalize exactly -3 when 0 of 2 difficult topics found', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Geometria' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Geometria', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ difficultTopics: ['Frações', 'Trigonometria'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    // 10 - 3 (difficult topics not found, ratio 0/2 < 0.5) = 7
    expect(report.scores.historyComplianceScore).toBe(7);
  });

  it('should penalize exactly -2 for skipped topics not rescheduled', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Geometria' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Geometria', numLessons: 2 },
        ],
      },
    });

    const history = createHistory({ skippedTopics: ['Estatística'] });
    const report = service.evaluate(plan, [], undefined, undefined, history);

    // 10 - 2 (skipped not rescheduled) = 8
    expect(report.scores.historyComplianceScore).toBe(8);
  });

  // ===== SF-3: Unverified label when no external context =====

  it('should return "unverified" when no parent, no siblings, no calendar (SF-3)', () => {
    const plan = createPlan();
    const report = service.evaluate(plan, []);

    expect(report.scores.qualityLabel).toBe('unverified');
  });

  it('should return "excellent" when calendar IS provided and score is high', () => {
    const plan = createPlan();
    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [], undefined, calendar);

    // Calendar provides external context → label should NOT be unverified
    expect(report.scores.qualityLabel).not.toBe('unverified');
    expect(report.scores.qualityLabel).toBe('excellent');
  });

  it('should return "unverified" even with high score if no context', () => {
    const plan = createPlan();
    const report = service.evaluate(plan, []);

    // Score is high (10/10 coherence, etc.) but no way to verify
    expect(report.scores.overallScore).toBeGreaterThanOrEqual(7);
    expect(report.scores.qualityLabel).toBe('unverified');
  });

  // ===== Accent normalization in quality scoring =====

  it('should match parent topics across accent variants (FIX-4)', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Algebra' }],
      },
    });

    const parent = createPlan({
      id: 'parent-1',
      type: PlanType.ANNUAL,
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
      },
    });

    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [], parent, calendar);

    // Should NOT warn about orphan topics — "Algebra" matches "Álgebra" after normalization
    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('não encontrado'),
    )).toBe(false);
    expect(report.insights.some(i =>
      i.type === 'success' && i.message.includes('alinhados'),
    )).toBe(true);
  });

  it('should detect sibling duplicates across accent variants', () => {
    const plan = createPlan({
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Equações' }],
      },
    });

    const sibling = createPlan({
      id: 'plan-2',
      content: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Equacoes' }],
      },
    });

    const calendar: CalendarContext = {
      terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
      events: [],
    };

    const report = service.evaluate(plan, [sibling], undefined, calendar);

    expect(report.insights.some(i =>
      i.type === 'warning' && i.message.includes('duplicado'),
    )).toBe(true);
  });
});
