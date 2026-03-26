import { FeedbackImpactService } from '@/src/ai/services/feedback-impact.service';
import { PlanContent } from '@/src/domain/entities/plan.entity';
import { TeachingHistoryContext } from '@/src/ai/services/teaching-history.service';
import { PACING_THRESHOLD, FAST_PACING_THRESHOLD } from '@/src/ai/config';

describe('FeedbackImpactService', () => {
  let service: FeedbackImpactService;

  beforeEach(() => {
    service = new FeedbackImpactService();
  });

  function makeContent(overrides: Partial<PlanContent> = {}): PlanContent {
    return {
      generalObjectives: ['Obj 1'],
      specificObjectives: ['Spec 1'],
      topics: [{ title: 'Frações', subtopics: ['soma'] }],
      weeklyPlan: [
        { week: '1', unit: 'U1', objectives: 'Obj', contents: 'Frações', numLessons: 2 },
      ],
      ...overrides,
    } as PlanContent;
  }

  function makeHistory(overrides: Partial<TeachingHistoryContext> = {}): TeachingHistoryContext {
    return {
      totalLessonsDelivered: 5,
      totalLessonsPartial: 0,
      totalLessonsSkipped: 0,
      completedTopics: ['Números'],
      delayedTopics: [],
      difficultTopics: [],
      skippedTopics: [],
      averageLessonDuration: 1.0,
      ...overrides,
    };
  }

  it('returns no adaptations when no history and no parent', () => {
    const content = makeContent();
    const report = service.analyze(content);
    expect(report.hasAdaptations).toBe(false);
    expect(report.changes).toHaveLength(0);
  });

  it('detects pacing change when average duration is high', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: 1.3 });
    const report = service.analyze(content, undefined, history);
    const pacingChanges = report.changes.filter(c => c.type === 'pacing');
    expect(pacingChanges.length).toBeGreaterThan(0);
    expect(pacingChanges[0].message).toContain('30%');
  });

  it('detects pacing change when average duration is low', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: 0.8 });
    const report = service.analyze(content, undefined, history);
    const pacingChanges = report.changes.filter(c => c.type === 'pacing');
    expect(pacingChanges.length).toBeGreaterThan(0);
    expect(pacingChanges[0].message).toContain('20%');
  });

  it('detects partial lesson pacing', () => {
    const content = makeContent();
    const history = makeHistory({ totalLessonsPartial: 3 });
    const report = service.analyze(content, undefined, history);
    const pacingChanges = report.changes.filter(c => c.type === 'pacing');
    expect(pacingChanges.some(c => c.message.includes('3 aula(s)'))).toBe(true);
  });

  it('detects reinforcement for difficult topics found in content', () => {
    const content = makeContent();
    const history = makeHistory({ difficultTopics: ['Frações'] });
    const report = service.analyze(content, undefined, history);
    const reinforcement = report.changes.filter(c => c.type === 'reinforcement');
    expect(reinforcement.length).toBeGreaterThan(0);
    expect(reinforcement[0].message).toContain('Frações');
  });

  it('detects difficult topics not directly in content', () => {
    const content = makeContent({
      topics: [{ title: 'Geometria', subtopics: [] }],
      weeklyPlan: [{ week: '1', unit: 'U1', objectives: 'Obj', contents: 'Geometria', numLessons: 2 }],
    });
    const history = makeHistory({ difficultTopics: ['Álgebra'] });
    const report = service.analyze(content, undefined, history);
    const reinforcement = report.changes.filter(c => c.type === 'reinforcement');
    expect(reinforcement.length).toBeGreaterThan(0);
    expect(reinforcement[0].message).toContain('1 tema(s)');
  });

  it('detects skipped content rescheduled', () => {
    const content = makeContent();
    const history = makeHistory({ skippedTopics: ['Frações'] });
    const report = service.analyze(content, undefined, history);
    const skipped = report.changes.filter(c => c.type === 'skipped');
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0].message).toContain('reagendámos');
  });

  it('detects skipped content that could not be included', () => {
    const content = makeContent({
      topics: [{ title: 'Geometria', subtopics: [] }],
      weeklyPlan: [{ week: '1', unit: 'U1', objectives: 'Obj', contents: 'Geometria', numLessons: 2 }],
    });
    const history = makeHistory({ skippedTopics: ['Trigonometria'] });
    const report = service.analyze(content, undefined, history);
    const skipped = report.changes.filter(c => c.type === 'skipped');
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0].message).toContain('não couberam');
  });

  it('detects workload changes when weeks differ from parent', () => {
    const content = makeContent({
      weeklyPlan: [
        { week: '1', unit: 'U1', objectives: 'O', contents: 'C', numLessons: 2 },
        { week: '2', unit: 'U1', objectives: 'O', contents: 'C', numLessons: 2 },
        { week: '3', unit: 'U2', objectives: 'O', contents: 'C', numLessons: 2 },
      ],
    });
    const parentContent = makeContent({
      weeklyPlan: [
        { week: '1', unit: 'U1', objectives: 'O', contents: 'C', numLessons: 2 },
        { week: '2', unit: 'U1', objectives: 'O', contents: 'C', numLessons: 2 },
      ],
    });
    const report = service.analyze(content, parentContent);
    const workload = report.changes.filter(c => c.type === 'workload');
    expect(workload.length).toBe(1);
    expect(workload[0].message).toContain('1 semana(s)');
  });

  // ===== B2: Null Safety =====

  it('should handle null contents in weeklyPlan without crashing', () => {
    const content = makeContent({
      weeklyPlan: [
        { week: '1', unit: 'U1', objectives: 'Obj', contents: null as unknown as string, numLessons: 2 },
      ],
    });
    const history = makeHistory({ difficultTopics: ['Frações'] });
    expect(() => service.analyze(content, undefined, history)).not.toThrow();
  });

  it('should handle undefined contents in weeklyPlan', () => {
    const content = makeContent({
      weeklyPlan: [
        { week: '1', unit: 'U1', objectives: 'Obj', contents: undefined as unknown as string, numLessons: 2 },
      ],
    });
    const history = makeHistory({ skippedTopics: ['Estatística'] });
    expect(() => service.analyze(content, undefined, history)).not.toThrow();
  });

  // ===== B3: Pacing Boundary Tests =====

  it('should NOT trigger slow pacing at exactly PACING_THRESHOLD', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: PACING_THRESHOLD });
    const report = service.analyze(content, undefined, history);
    const slowPacing = report.changes.filter(c => c.type === 'pacing' && c.message.includes('demoram'));
    expect(slowPacing).toHaveLength(0);
  });

  it('should trigger slow pacing just above PACING_THRESHOLD', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: PACING_THRESHOLD + 0.01 });
    const report = service.analyze(content, undefined, history);
    expect(report.changes.some(c => c.type === 'pacing' && c.message.includes('demoram'))).toBe(true);
  });

  it('should NOT trigger fast pacing at exactly FAST_PACING_THRESHOLD', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: FAST_PACING_THRESHOLD });
    const report = service.analyze(content, undefined, history);
    const fastPacing = report.changes.filter(c => c.type === 'pacing' && c.message.includes('rápidas'));
    expect(fastPacing).toHaveLength(0);
  });

  it('should trigger fast pacing just below FAST_PACING_THRESHOLD', () => {
    const content = makeContent();
    const history = makeHistory({ averageLessonDuration: FAST_PACING_THRESHOLD - 0.01 });
    const report = service.analyze(content, undefined, history);
    expect(report.changes.some(c => c.type === 'pacing' && c.message.includes('rápidas'))).toBe(true);
  });
});
