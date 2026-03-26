import { describe, it, expect } from 'vitest';
import { PlanValidationService } from '@/src/ai/services/plan-validation.service';
import { PlanType } from '@/src/domain/entities/plan.entity';

describe('PlanValidationService', () => {
  const validator = new PlanValidationService();

  it('should pass validation for structurally complete trimester plan', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj 1'],
        specificObjectives: ['Obj esp 1'],
        competencies: ['Comp 1'],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Conteúdo', numLessons: 2 },
        ],
        totalWeeks: 1,
        totalLessons: 2,
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should flag missing objectives as error', () => {
    const result = validator.validate({
      planType: PlanType.ANNUAL,
      generatedContent: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema' }],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MISSING_OBJECTIVES' }),
    );
  });

  it('should flag missing weekly plan for trimester type', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema' }],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MISSING_WEEKLY_PLAN' }),
    );
  });

  it('should warn about topics not found in parent plan', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema Inventado XYZ' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Conteúdo', numLessons: 2 },
        ],
        totalWeeks: 1,
        totalLessons: 2,
      },
      parentPlanContent: {
        generalObjectives: ['Obj pai'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra Básica' }],
      },
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'TOPIC_NOT_IN_PARENT' }),
    );
  });

  it('should flag duplicate topics across sibling plans', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra Básica' }, { title: 'Geometria' }, { title: 'Funções' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Conteúdo', numLessons: 2 },
        ],
        totalWeeks: 1,
        totalLessons: 2,
      },
      siblingPlanSummaries: [
        { title: '1º Trimestre', topicTitles: ['Álgebra Básica', 'Geometria'], generalObjectives: [] },
      ],
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_SIBLING_TOPICS' }),
    );
  });

  it('should flag week count mismatch with calendar', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      trimester: 1,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema' }],
        weeklyPlan: Array.from({ length: 5 }, (_, i) => ({
          week: `${i + 1}ª`, unit: 'I', objectives: 'Obj', contents: 'C', numLessons: 2,
        })),
        totalWeeks: 5,
        totalLessons: 10,
      },
      calendarContext: {
        terms: [{ trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 12 }],
        events: [],
        effectiveTeachingWeeks: 12,
      },
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'WEEK_COUNT_MISMATCH', severity: 'error' }),
    );
  });

  it('should flag missing lesson phases for lesson type', () => {
    const result = validator.validate({
      planType: PlanType.LESSON,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Tema' }],
        topic: 'Tema da aula',
        lessonPhases: [
          { name: 'Início', duration: '5 min', activities: [] },
        ],
      },
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MISSING_LESSON_PHASES' }),
    );
  });

  // ===== CF-1: Null safety in parent weeklyPlan =====

  it('should NOT crash when parent weeklyPlan has null contents (CF-1)', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Álgebra', numLessons: 2 },
        ],
      },
      parentPlanContent: {
        generalObjectives: ['Obj pai'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: null as unknown as string, numLessons: 2 },
          { week: '2ª', unit: null as unknown as string, objectives: 'Obj', contents: undefined as unknown as string, numLessons: 2 },
        ],
      },
    });

    // Should not throw — and topics should still be validated
    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
  });

  // ===== Accent normalization =====

  it('should match topics with different accent variants (FIX-4)', () => {
    // Parent uses "Equações", generated uses "Equacoes" — should match after normalization
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Equacoes Lineares' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'Equações', numLessons: 2 },
        ],
      },
      parentPlanContent: {
        generalObjectives: ['Obj pai'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Equações Lineares' }],
      },
    });

    // "Equacoes Lineares" and "Equações Lineares" normalize to same string
    const topicWarnings = result.issues.filter(i => i.code === 'TOPIC_NOT_IN_PARENT');
    expect(topicWarnings).toHaveLength(0);
  });

  it('should match "Algebra" with "Álgebra" after normalization', () => {
    const result = validator.validate({
      planType: PlanType.ANNUAL,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Algebra Basica' }],
      },
      parentPlanContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra Básica' }],
      },
    });

    const topicWarnings = result.issues.filter(i => i.code === 'TOPIC_NOT_IN_PARENT');
    expect(topicWarnings).toHaveLength(0);
  });

  it('should detect sibling duplicates across accent variants', () => {
    const result = validator.validate({
      planType: PlanType.TRIMESTER,
      generatedContent: {
        generalObjectives: ['Obj'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Equações Quadráticas' }],
        weeklyPlan: [
          { week: '1ª', unit: 'I', objectives: 'Obj', contents: 'C', numLessons: 2 },
        ],
      },
      siblingPlanSummaries: [
        { title: '1º Tri', topicTitles: ['Equacoes Quadraticas'], generalObjectives: [] },
      ],
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_SIBLING_TOPICS' }),
    );
  });
});
