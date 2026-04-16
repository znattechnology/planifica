import { PlanContent, PlanType, WeeklyPlanItem, AnnualTrimesterSection } from '@/src/domain/entities/plan.entity';
import { DosificacaoContent } from '@/src/domain/entities/dosificacao.entity';
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
  dosificacaoContent?: DosificacaoContent; // for real coverage validation on Annual plans
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

    // For trimester plans: check topic count against trimester-specific source
    if (ctx.planType === PlanType.TRIMESTER && generated.weeklyPlan) {
      const trimSection = parent.trimesters?.find(t => t.number === ctx.trimester);
      const sourceTopicCount = trimSection ? trimSection.topics.length : (parent.topics?.length ?? 0);
      const generatedTopicCount = generated.topics?.length ?? 0;
      if (sourceTopicCount > 0 && generatedTopicCount > sourceTopicCount * 2) {
        issues.push({
          severity: 'warning',
          code: 'EXCESS_TOPICS',
          message: `Plano trimestral tem ${generatedTopicCount} temas mas a fonte (${trimSection ? `T${ctx.trimester} do plano anual` : 'plano pai'}) tem apenas ${sourceTopicCount}. Possível conteúdo inventado.`,
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

    const siblingTopicWords = (ctx.siblingPlanSummaries || []).flatMap(s =>
      s.topicTitles.map(t => this.normalize(t).split(/\s+/).filter(w => w.length >= 4)),
    );

    let duplicateCount = 0;
    for (const topic of generated.topics || []) {
      const titleWords = this.normalize(topic.title).split(/\s+/).filter(w => w.length >= 4);
      if (titleWords.length === 0) continue;

      const isDuplicate = siblingTopicWords.some(sibWords => {
        if (sibWords.length === 0) return false;
        const shared = titleWords.filter(w => sibWords.includes(w)).length;
        const overlap = shared / Math.max(titleWords.length, sibWords.length);
        return overlap >= 0.8;
      });
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

    if (ctx.planType === PlanType.ANNUAL) {
      issues.push(...this.validateAnnualTrimesterCoverage(c, ctx.dosificacaoContent));
    }

    if (ctx.planType === PlanType.TRIMESTER) {
      if (!c.weeklyPlan || c.weeklyPlan.length === 0) {
        issues.push({ severity: 'error', code: 'MISSING_WEEKLY_PLAN', message: 'Plano semanal em falta para dosificação trimestral.' });
      }
      this.validateWeeklyPlanIntegrity(c.weeklyPlan || [], issues);

      // Topic density: too many topics relative to actual teaching weeks makes the plan undeliverable.
      // This passes all other validations (correct week count, correct topic list) but is impossible in class.
      if (c.weeklyPlan && c.weeklyPlan.length > 0) {
        const teachingWeeks = c.weeklyPlan.filter(w => w.numLessons > 0).length;
        if (teachingWeeks === 0) {
          // Fire regardless of topic count: a plan where ALL weeks have numLessons=0 is
          // unteachable even if it has no topics listed. This also catches the post-correction
          // scenario where holiday zeroing empties the entire schedule.
          issues.push({
            severity: 'error',
            code: 'NO_TEACHING_WEEKS',
            message: 'Plano trimestral sem semanas lectivas (todas as semanas têm 0 aulas). Impossível distribuir conteúdos.',
          });
        } else if (c.topics && c.topics.length > 0) {
          const density = c.topics.length / teachingWeeks;
          if (density > 2.5) {
            issues.push({
              severity: 'warning',
              code: 'TOPIC_DENSITY_HIGH',
              message: `${c.topics.length} temas em ${teachingWeeks} semanas lectivas (${density.toFixed(1)} temas/semana). Plano pode ser difícil de executar em sala de aula.`,
            });
          }
        }
      }
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

  /**
   * Validate trimester coverage for Annual plans.
   * Checks: count === 3, real coverage vs dosificação, no duplicates, no empty trimester,
   *         balanced distribution (error if >60%), and logical ordering.
   */
  private validateAnnualTrimesterCoverage(
    c: PlanContent,
    dosificacaoContent?: DosificacaoContent,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const trimesters = c.trimesters as AnnualTrimesterSection[] | undefined;

    if (!trimesters || trimesters.length === 0) {
      // Legacy plans without trimesters[] remain valid — no error
      return issues;
    }

    // Task 3 — Enforce exactly 3 trimesters
    if (trimesters.length !== 3) {
      issues.push({
        severity: 'error',
        code: 'TRIMESTER_COUNT_INVALID',
        message: `Plano anual inválido: deve conter exactamente 3 trimestres (encontrado: ${trimesters.length}).`,
      });
      // Continue checking what's there, but the structure is already invalid
    }

    // Empty trimester check
    for (const t of trimesters) {
      if (t.topics.length === 0) {
        issues.push({
          severity: 'error',
          code: 'TRIMESTER_EMPTY',
          message: `Trimestre ${t.number} não tem temas atribuídos.`,
        });
      }
    }

    // Exclusivity — same topic in more than one trimester
    const seen = new Map<string, number>();
    for (const t of trimesters) {
      for (const topic of t.topics) {
        const key = this.normalize(topic.title);
        const prev = seen.get(key);
        if (prev !== undefined) {
          issues.push({
            severity: 'warning',
            code: 'TRIMESTER_TOPIC_DUPLICATE',
            message: `Tema "${topic.title}" aparece em T${prev} e T${t.number}.`,
          });
        } else {
          seen.set(key, t.number);
        }
      }
    }

    // Task 1 — Real coverage check against dosificação (the authoritative source)
    if (dosificacaoContent) {
      const dosTopicCount = dosificacaoContent.unidades.reduce(
        (sum, u) => sum + u.topicos.length, 0,
      );
      const trimTopicCount = trimesters.reduce((sum, t) => sum + t.topics.length, 0);

      if (trimTopicCount < dosTopicCount) {
        const missing = dosTopicCount - trimTopicCount;
        issues.push({
          severity: missing > dosTopicCount * 0.15 ? 'error' : 'warning',
          code: 'TRIMESTER_COVERAGE_INCOMPLETE',
          message: `Dosificação tem ${dosTopicCount} tópicos mas trimesters[] distribuem apenas ${trimTopicCount} (${missing} possivelmente omitido(s)).`,
        });
      }

      // Unit-level coverage — each unidade.nome should appear in at least one trimester
      for (const unidade of dosificacaoContent.unidades) {
        if (!unidade.nome?.trim()) continue;
        const unidadeKey = this.normalize(unidade.nome);
        const firstWord = unidadeKey.split(' ').find(w => w.length >= 4) ?? unidadeKey;
        if (!firstWord) continue;

        const found = trimesters.some(t =>
          t.topics.some(topic => this.normalize(topic.title).includes(firstWord)),
        );
        if (!found) {
          issues.push({
            severity: 'warning',
            code: 'TRIMESTER_UNIT_MISSING',
            message: `Unidade "${unidade.nome}" da dosificação não encontrada em nenhum trimestre.`,
          });
        }
      }
    }

    // Task 6 — Imbalance is now an error (was warning)
    const totalTopics = trimesters.reduce((sum, t) => sum + t.topics.length, 0);
    if (totalTopics > 0) {
      for (const t of trimesters) {
        const ratio = t.topics.length / totalTopics;
        if (ratio > 0.6) {
          issues.push({
            severity: 'error',
            code: 'TRIMESTER_IMBALANCE',
            message: `Trimestre ${t.number} concentra ${Math.round(ratio * 100)}% dos temas — distribuição inválida (máximo: 60%).`,
          });
        }
      }
    }

    // Task 7 — Ordering sanity: T1 topics should appear earlier in annual list than T2, T2 before T3
    issues.push(...this.validateTrimesterOrdering(c, trimesters));

    return issues;
  }

  /**
   * Validate that trimesters follow the natural progression of the annual plan.
   * Uses position in the flat topics[] as a proxy for intended order.
   */
  private validateTrimesterOrdering(c: PlanContent, trimesters: AnnualTrimesterSection[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const allTopicTitles = (c.topics || []).map(t => this.normalize(t.title));
    if (allTopicTitles.length === 0) return issues;

    const avgPosition = (topics: AnnualTrimesterSection['topics']): number => {
      const positions = topics
        .map(t => allTopicTitles.indexOf(this.normalize(t.title)))
        .filter(idx => idx >= 0);
      return positions.length > 0
        ? positions.reduce((a, b) => a + b, 0) / positions.length
        : -1;
    };

    const sorted = [...trimesters].sort((a, b) => a.number - b.number);
    const avgPositions = sorted.map(t => ({ number: t.number, avg: avgPosition(t.topics) }));

    for (let i = 0; i < avgPositions.length - 1; i++) {
      const curr = avgPositions[i];
      const next = avgPositions[i + 1];
      // Only flag if both trimesters have resolvable positions and ordering is clearly inverted
      if (curr.avg >= 0 && next.avg >= 0 && curr.avg >= next.avg) {
        issues.push({
          severity: 'warning',
          code: 'TRIMESTER_ORDER_INCONSISTENT',
          message: `T${curr.number} (posição média ${Math.round(curr.avg + 1)}) não precede T${next.number} (posição média ${Math.round(next.avg + 1)}) na sequência anual — possível inversão de progressão.`,
        });
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

    this.validatePedagogicalSequence(weeklyPlan, issues);
  }

  /**
   * Lightweight pedagogical sequence heuristic.
   *
   * Checks two signals without requiring a curriculum graph:
   * 1. Review-before-exam: every assessment week should have a revision week immediately before it.
   * 2. Abrupt start: week 1 should introduce topics gently — not open with an assessment.
   *
   * These are warnings, never errors — they surface suggestions without blocking generation.
   */
  private validatePedagogicalSequence(weeklyPlan: WeeklyPlanItem[], issues: ValidationIssue[]): void {
    if (weeklyPlan.length < 2) return;

    const EXAM_PATTERN = /\b(avalia[çc][ãa]o|prova|teste|exame|provas)\b/i;
    const REVIEW_PATTERN = /\brev[ií]s[ãa]o\b/i;

    // Signal 1: assessment week without prior review week
    for (let i = 1; i < weeklyPlan.length; i++) {
      const week = weeklyPlan[i];
      const weekText = `${week.objectives ?? ''} ${week.contents ?? ''}`;
      if (EXAM_PATTERN.test(weekText)) {
        const prevWeek = weeklyPlan[i - 1];
        const prevText = `${prevWeek.objectives ?? ''} ${prevWeek.contents ?? ''}`;
        if (!REVIEW_PATTERN.test(prevText) && prevWeek.numLessons > 0) {
          issues.push({
            severity: 'warning',
            code: 'PEDAGOGICAL_SEQUENCE_WEAK',
            message: `Semana ${i + 1} (avaliação) sem semana de revisão imediatamente antes. Considere dedicar a semana ${i} à revisão dos conteúdos avaliados.`,
          });
        }
      }
    }

    // Signal 2: first teaching week opens with an assessment
    const firstTeaching = weeklyPlan.find(w => w.numLessons > 0);
    if (firstTeaching) {
      const firstText = `${firstTeaching.objectives ?? ''} ${firstTeaching.contents ?? ''}`;
      if (EXAM_PATTERN.test(firstText)) {
        issues.push({
          severity: 'warning',
          code: 'PEDAGOGICAL_SEQUENCE_WEAK',
          message: 'A primeira semana lectiva contém avaliação sem introdução prévia de conteúdos.',
        });
      }
    }
  }

  private normalize(text: string): string {
    return (text ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
