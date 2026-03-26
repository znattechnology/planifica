import { PlanContent, PlanType, WeeklyPlanItem } from '@/src/domain/entities/plan.entity';
import { CalendarContext, SiblingPlanSummary } from '@/src/domain/interfaces/services/ai-plan-generator.service';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationContext {
  planType: PlanType;
  generatedContent: PlanContent;
  parentPlanContent?: PlanContent;
  siblingPlanSummaries?: SiblingPlanSummary[];
  calendarContext?: CalendarContext;
  trimester?: number;
}

/**
 * Post-generation validation service.
 *
 * Validates AI output against the parent plan, sibling plans,
 * and calendar constraints to ensure coherence.
 */
export class PlanValidationService {
  validate(ctx: ValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (ctx.parentPlanContent) {
      issues.push(...this.validateParentAlignment(ctx));
    }

    if (ctx.siblingPlanSummaries && ctx.siblingPlanSummaries.length > 0) {
      issues.push(...this.validateSiblingUniqueness(ctx));
    }

    if (ctx.calendarContext) {
      issues.push(...this.validateCalendarCompliance(ctx));
    }

    issues.push(...this.validateStructuralIntegrity(ctx));

    return {
      valid: issues.every(i => i.severity !== 'error'),
      issues,
    };
  }

  /**
   * Check that generated topics are a subset of the parent plan topics.
   * Generated objectives should align with parent objectives.
   */
  private validateParentAlignment(ctx: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const parent = ctx.parentPlanContent!;
    const generated = ctx.generatedContent;

    // Build normalized parent topic set
    const parentTopics = new Set(
      (parent.topics || []).map(t => this.normalize(t.title)),
    );

    // Also include weekly plan contents as valid parent topics
    if (parent.weeklyPlan) {
      for (const w of parent.weeklyPlan) {
        // The contents field may have multiple items separated by \n
        const contentParts = (w.contents ?? '').split('\n').map(c => this.normalize(c));
        contentParts.forEach(c => { if (c) parentTopics.add(c); });
        parentTopics.add(this.normalize(w.unit ?? ''));
      }
    }

    // Check each generated topic exists in parent
    for (const topic of generated.topics || []) {
      const normalizedTitle = this.normalize(topic.title);
      const found = [...parentTopics].some(pt =>
        pt.includes(normalizedTitle) || normalizedTitle.includes(pt),
      );
      if (!found && parentTopics.size > 0) {
        issues.push({
          severity: 'warning',
          code: 'TOPIC_NOT_IN_PARENT',
          message: `Tema "${topic.title}" não encontrado no plano pai. Possível conteúdo inventado.`,
        });
      }
    }

    // For trimester plans: check week count alignment
    if (ctx.planType === PlanType.TRIMESTER && generated.weeklyPlan && parent.topics) {
      const parentTopicCount = parent.topics.length;
      const generatedTopicCount = generated.topics.length;
      if (generatedTopicCount > parentTopicCount * 2) {
        issues.push({
          severity: 'warning',
          code: 'EXCESS_TOPICS',
          message: `Plano gerado tem ${generatedTopicCount} temas mas o plano pai tem apenas ${parentTopicCount}. Possível conteúdo excessivo.`,
        });
      }
    }

    return issues;
  }

  /**
   * Ensure no significant topic duplication across sibling plans.
   */
  private validateSiblingUniqueness(ctx: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const generated = ctx.generatedContent;

    const siblingTopics = new Set(
      (ctx.siblingPlanSummaries || []).flatMap(s => s.topicTitles.map(t => this.normalize(t))),
    );

    let duplicateCount = 0;
    for (const topic of generated.topics || []) {
      const normalizedTitle = this.normalize(topic.title);
      const isDuplicate = [...siblingTopics].some(st =>
        st === normalizedTitle || (st.length > 5 && normalizedTitle.includes(st)) || (normalizedTitle.length > 5 && st.includes(normalizedTitle)),
      );
      if (isDuplicate) {
        duplicateCount++;
      }
    }

    if (duplicateCount > 0) {
      issues.push({
        severity: duplicateCount > 2 ? 'error' : 'warning',
        code: 'DUPLICATE_SIBLING_TOPICS',
        message: `${duplicateCount} tema(s) duplicado(s) com planos irmãos já gerados.`,
      });
    }

    return issues;
  }

  /**
   * Validate that generated plan respects calendar week constraints.
   */
  private validateCalendarCompliance(ctx: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const generated = ctx.generatedContent;
    const calendar = ctx.calendarContext!;

    if (!generated.weeklyPlan) return issues;

    // Check week count matches calendar
    const trimNum = ctx.trimester || 1;
    const term = calendar.terms.find(t => t.trimester === trimNum);
    if (term) {
      const expectedWeeks = calendar.effectiveTeachingWeeks || term.teachingWeeks;
      const actualWeeks = generated.weeklyPlan.length;
      const diff = Math.abs(expectedWeeks - actualWeeks);

      if (diff > 2) {
        issues.push({
          severity: 'error',
          code: 'WEEK_COUNT_MISMATCH',
          message: `Calendário indica ${expectedWeeks} semanas lectivas mas o plano gerou ${actualWeeks} semanas (diferença: ${diff}).`,
        });
      } else if (diff > 0) {
        issues.push({
          severity: 'warning',
          code: 'WEEK_COUNT_DRIFT',
          message: `Pequena diferença: calendário tem ${expectedWeeks} semanas, plano tem ${actualWeeks}.`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate basic structural integrity of generated content.
   */
  private validateStructuralIntegrity(ctx: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const c = ctx.generatedContent;

    if (!c.generalObjectives || c.generalObjectives.length === 0) {
      issues.push({ severity: 'error', code: 'MISSING_OBJECTIVES', message: 'Objectivos gerais em falta.' });
    }

    if (!c.topics || c.topics.length === 0) {
      issues.push({ severity: 'error', code: 'MISSING_TOPICS', message: 'Temas em falta.' });
    }

    if (ctx.planType === PlanType.TRIMESTER) {
      if (!c.weeklyPlan || c.weeklyPlan.length === 0) {
        issues.push({ severity: 'error', code: 'MISSING_WEEKLY_PLAN', message: 'Plano semanal em falta para dosificação trimestral.' });
      }
      this.validateWeeklyPlanIntegrity(c.weeklyPlan || [], issues);
    }

    if (ctx.planType === PlanType.LESSON) {
      if (!c.lessonPhases || c.lessonPhases.length !== 4) {
        issues.push({ severity: 'error', code: 'MISSING_LESSON_PHASES', message: `Plano de aula deve ter 4 fases, tem ${c.lessonPhases?.length || 0}.` });
      }
      if (!c.topic) {
        issues.push({ severity: 'error', code: 'MISSING_LESSON_TOPIC', message: 'Tema principal da aula em falta.' });
      }
    }

    return issues;
  }

  private validateWeeklyPlanIntegrity(weeklyPlan: WeeklyPlanItem[], issues: ValidationIssue[]): void {
    for (let i = 0; i < weeklyPlan.length; i++) {
      const w = weeklyPlan[i];
      if (!w.objectives || w.objectives.trim() === '') {
        issues.push({ severity: 'warning', code: 'EMPTY_WEEK_OBJECTIVES', message: `Semana ${i + 1}: objectivos vazios.` });
      }
      if (!w.contents || w.contents.trim() === '') {
        issues.push({ severity: 'warning', code: 'EMPTY_WEEK_CONTENTS', message: `Semana ${i + 1}: conteúdos vazios.` });
      }
      if (w.numLessons <= 0) {
        issues.push({ severity: 'warning', code: 'INVALID_LESSON_COUNT', message: `Semana ${i + 1}: número de aulas inválido (${w.numLessons}).` });
      }
    }
  }

  private normalize(text: string): string {
    return (text ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
