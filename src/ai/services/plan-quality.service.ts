import { Plan, PlanType, PlanStatus, PlanQualityScores } from '@/src/domain/entities/plan.entity';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { TeachingHistoryContext } from './teaching-history.service';
import { PACING_THRESHOLD, normalizeText } from '@/src/ai/config';

export interface PlanInsight {
  type: 'success' | 'warning' | 'error';
  message: string;
}

export interface PlanQualityReport {
  scores: PlanQualityScores;
  insights: PlanInsight[];
}

/**
 * Evaluates individual plan quality across 4 dimensions:
 * coherence, workload balance, calendar alignment, and history compliance.
 */
export class PlanQualityService {

  evaluate(
    plan: Plan,
    siblingPlans: Plan[],
    parentPlan?: Plan,
    calendarContext?: CalendarContext,
    teachingHistory?: TeachingHistoryContext,
  ): PlanQualityReport {
    const coherence = this.evaluateCoherence(plan, siblingPlans, parentPlan);
    const workload = this.evaluateWorkloadBalance(plan);
    const calendar = this.evaluateCalendarAlignment(plan, calendarContext);
    const history = teachingHistory
      ? this.evaluateHistoryCompliance(plan, teachingHistory)
      : null;

    // Weights: coherence 35%, workload 25%, calendar 25%, history 15% (when present)
    let overall: number;
    if (history) {
      overall = Math.round(
        (coherence.score * 0.35 + workload.score * 0.25 + calendar.score * 0.25 + history.score * 0.15) * 10
      ) / 10;
    } else {
      overall = Math.round(
        (coherence.score * 0.4 + workload.score * 0.3 + calendar.score * 0.3) * 10
      ) / 10;
    }

    // If no external context was available, the score is unverifiable
    const hasExternalContext = !!parentPlan || siblingPlans.length > 0 || !!calendarContext;
    const qualityLabel = !hasExternalContext ? 'unverified' as const
      : overall >= 8 ? 'excellent' as const
      : overall >= 5 ? 'good' as const
      : 'needs_review' as const;

    const scores: PlanQualityScores = {
      coherenceScore: coherence.score,
      workloadBalanceScore: workload.score,
      calendarAlignmentScore: calendar.score,
      ...(history ? { historyComplianceScore: history.score } : {}),
      overallScore: overall,
      qualityLabel,
      evaluatedAt: new Date().toISOString(),
    };

    const insights = [
      ...coherence.insights,
      ...workload.insights,
      ...calendar.insights,
      ...(history ? history.insights : []),
    ];

    return { scores, insights };
  }

  private evaluateCoherence(
    plan: Plan,
    siblings: Plan[],
    parent?: Plan,
  ): { score: number; insights: PlanInsight[] } {
    let score = 10;
    const insights: PlanInsight[] = [];
    const content = plan.content;

    // Check topics exist
    if (!content.topics || content.topics.length === 0) {
      score -= 3;
      insights.push({ type: 'error', message: 'Plano não tem temas definidos.' });
    }

    // Check objectives exist
    if (!content.generalObjectives || content.generalObjectives.length === 0) {
      score -= 2;
      insights.push({ type: 'error', message: 'Objectivos gerais em falta.' });
    }

    // Check against parent — topics should be subset
    if (parent && content.topics && parent.content.topics) {
      const parentTopicSet = new Set(
        parent.content.topics.map(t => normalizeText(t.title)),
      );
      const orphanTopics = content.topics.filter(t =>
        ![...parentTopicSet].some(pt =>
          pt.includes(normalizeText(t.title)) ||
          normalizeText(t.title).includes(pt)
        ),
      );
      if (orphanTopics.length > 0) {
        score -= Math.min(3, orphanTopics.length);
        insights.push({
          type: 'warning',
          message: `${orphanTopics.length} tema(s) não encontrado(s) no plano pai: ${orphanTopics.map(t => t.title).join(', ')}.`,
        });
      } else {
        insights.push({ type: 'success', message: 'Todos os temas alinhados com o plano pai.' });
      }
    }

    // Check sibling duplication
    if (siblings.length > 0) {
      const siblingTopics = new Set(
        siblings.flatMap(s => (s.content.topics || []).map(t => normalizeText(t.title))),
      );
      const duplicateCount = (content.topics || []).filter(t =>
        siblingTopics.has(normalizeText(t.title)),
      ).length;

      if (duplicateCount === 0) {
        insights.push({ type: 'success', message: 'Sem duplicação de temas com planos irmãos.' });
      } else {
        score -= Math.min(3, duplicateCount);
        insights.push({
          type: 'warning',
          message: `${duplicateCount} tema(s) duplicado(s) com planos irmãos.`,
        });
      }
    }

    return { score: Math.max(0, Math.min(10, score)), insights };
  }

  private evaluateWorkloadBalance(
    plan: Plan,
  ): { score: number; insights: PlanInsight[] } {
    let score = 10;
    const insights: PlanInsight[] = [];
    const content = plan.content;

    if (plan.type === PlanType.TRIMESTER && content.weeklyPlan) {
      const weeks = content.weeklyPlan;
      const lessonCounts = weeks.map(w => w.numLessons);
      const avg = lessonCounts.reduce((a, b) => a + b, 0) / lessonCounts.length;

      // Check for overloaded weeks
      const overloaded = weeks.filter(w => w.numLessons > avg * 1.5);
      if (overloaded.length > 0) {
        score -= Math.min(3, overloaded.length);
        insights.push({
          type: 'warning',
          message: `${overloaded.length} semana(s) com carga acima da média (${Math.round(avg)} aulas/semana).`,
        });
      }

      // Check for empty objectives
      const emptyWeeks = weeks.filter(w => !w.objectives || w.objectives.trim() === '');
      if (emptyWeeks.length > 0) {
        score -= Math.min(2, emptyWeeks.length);
        insights.push({
          type: 'warning',
          message: `${emptyWeeks.length} semana(s) sem objectivos definidos.`,
        });
      }

      if (overloaded.length === 0 && emptyWeeks.length === 0) {
        insights.push({ type: 'success', message: 'Carga de trabalho equilibrada ao longo das semanas.' });
      }
    }

    if (plan.type === PlanType.LESSON && content.lessonPhases) {
      if (content.lessonPhases.length === 4) {
        insights.push({ type: 'success', message: 'Plano de aula com as 4 fases obrigatórias.' });
      } else {
        score -= 3;
        insights.push({
          type: 'error',
          message: `Plano de aula tem ${content.lessonPhases.length} fases (esperado: 4).`,
        });
      }
    }

    return { score: Math.max(0, Math.min(10, score)), insights };
  }

  private evaluateCalendarAlignment(
    plan: Plan,
    calendar?: CalendarContext,
  ): { score: number; insights: PlanInsight[] } {
    let score = 10;
    const insights: PlanInsight[] = [];

    if (!calendar) {
      // No calendar to check against — assume ok but note it
      score = 7; // neutral-ish score
      insights.push({
        type: 'warning',
        message: 'Calendário escolar não disponível — não foi possível verificar alinhamento.',
      });
      return { score, insights };
    }

    if (plan.type === PlanType.TRIMESTER && plan.content.weeklyPlan) {
      const trimNum = plan.trimester || 1;
      const term = calendar.terms.find(t => t.trimester === trimNum);

      if (term) {
        const expectedWeeks = calendar.effectiveTeachingWeeks || term.teachingWeeks;
        const actualWeeks = plan.content.weeklyPlan.length;
        const diff = Math.abs(expectedWeeks - actualWeeks);

        if (diff === 0) {
          insights.push({
            type: 'success',
            message: `Alinhado com calendário: ${actualWeeks} semanas lectivas (exacto).`,
          });
        } else if (diff <= 1) {
          score -= 1;
          insights.push({
            type: 'warning',
            message: `Pequena diferença: ${actualWeeks} semanas no plano vs ${expectedWeeks} no calendário.`,
          });
        } else {
          score -= Math.min(5, diff);
          insights.push({
            type: 'error',
            message: `Desalinhamento: ${actualWeeks} semanas no plano vs ${expectedWeeks} no calendário (diferença: ${diff}).`,
          });
        }
      }

      // Check for lessons scheduled on holidays
      const holidayDates = new Set(
        calendar.events.map(e => e.startDate),
      );
      const conflicting = plan.content.weeklyPlan.filter(w =>
        w.period && holidayDates.has(w.period.split(' ')[0]),
      );
      if (conflicting.length > 0) {
        score -= 2;
        insights.push({
          type: 'error',
          message: `${conflicting.length} semana(s) podem conflitar com feriados.`,
        });
      } else {
        insights.push({ type: 'success', message: 'Sem conflitos com feriados detectados.' });
      }
    }

    if (plan.type === PlanType.ANNUAL) {
      const totalCalendarWeeks = calendar.terms.reduce((sum, t) => sum + t.teachingWeeks, 0);
      const planWeeks = plan.content.totalWeeks;
      if (planWeeks && Math.abs(planWeeks - totalCalendarWeeks) <= 2) {
        insights.push({ type: 'success', message: `Total de semanas alinhado com calendário (${planWeeks}/${totalCalendarWeeks}).` });
      } else if (planWeeks) {
        score -= 2;
        insights.push({
          type: 'warning',
          message: `Total semanas: plano tem ${planWeeks}, calendário tem ${totalCalendarWeeks}.`,
        });
      }
    }

    return { score: Math.max(0, Math.min(10, score)), insights };
  }

  /**
   * Validates whether the AI actually adapted the plan based on teaching history.
   * Checks: difficult topics get more time, skipped topics are rescheduled,
   * pacing adjustments are reflected in content density.
   */
  private evaluateHistoryCompliance(
    plan: Plan,
    history: TeachingHistoryContext,
  ): { score: number; insights: PlanInsight[] } {
    let score = 10;
    const insights: PlanInsight[] = [];
    const content = plan.content;
    let checksPerformed = 0;

    // Normalize all plan content for matching
    const allPlanText = normalizeText(this.collectPlanText(plan));
    const topicTitles = (content.topics || []).map(t => normalizeText(t.title || ''));
    const weeklyContents = (content.weeklyPlan || []).map(w => normalizeText(w.contents ?? ''));

    // Check 1: Difficult topics should appear in the plan (reinforcement)
    if (history.difficultTopics.length > 0) {
      checksPerformed++;
      let foundCount = 0;
      for (const difficult of history.difficultTopics) {
        const dl = normalizeText(difficult);
        const found = topicTitles.some(t => t.includes(dl) || dl.includes(t))
          || weeklyContents.some(c => c.includes(dl) || dl.includes(c))
          || allPlanText.includes(dl);
        if (found) foundCount++;
      }

      const ratio = foundCount / history.difficultTopics.length;
      if (ratio >= 0.5) {
        insights.push({
          type: 'success',
          message: `${foundCount}/${history.difficultTopics.length} tema(s) difícil(eis) incluído(s) no plano para reforço.`,
        });
      } else {
        score -= 3;
        const missing = history.difficultTopics.filter(d => {
          const dl = normalizeText(d);
          return !topicTitles.some(t => t.includes(dl) || dl.includes(t))
            && !weeklyContents.some(c => c.includes(dl) || dl.includes(c));
        });
        insights.push({
          type: 'warning',
          message: `Temas difíceis não reforçados no plano: ${missing.join(', ')}.`,
        });
      }
    }

    // Check 2: Skipped topics should be rescheduled
    if (history.skippedTopics.length > 0) {
      checksPerformed++;
      let rescheduledCount = 0;
      for (const skipped of history.skippedTopics) {
        const sl = normalizeText(skipped);
        const found = topicTitles.some(t => t.includes(sl) || sl.includes(t))
          || weeklyContents.some(c => c.includes(sl) || sl.includes(c));
        if (found) rescheduledCount++;
      }

      if (rescheduledCount > 0) {
        insights.push({
          type: 'success',
          message: `${rescheduledCount}/${history.skippedTopics.length} tema(s) não dado(s) foi(foram) reagendado(s).`,
        });
      } else {
        score -= 2;
        insights.push({
          type: 'warning',
          message: `Nenhum dos ${history.skippedTopics.length} tema(s) não dado(s) aparece no plano.`,
        });
      }
    }

    // Check 3: Pacing — if teacher runs slow (>PACING_THRESHOLD), plan should have fewer lessons/week
    if (history.averageLessonDuration > PACING_THRESHOLD && content.weeklyPlan && content.weeklyPlan.length > 0) {
      checksPerformed++;
      const avgLessonsPerWeek = content.weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0) / content.weeklyPlan.length;
      // Reasonable pacing: <= 2 lessons/week for slow teachers
      if (avgLessonsPerWeek <= 2.5) {
        insights.push({
          type: 'success',
          message: `Ritmo ajustado: média de ${avgLessonsPerWeek.toFixed(1)} aulas/semana (professor com ritmo mais lento).`,
        });
      } else {
        score -= 2;
        insights.push({
          type: 'warning',
          message: `Ritmo pode não estar ajustado: ${avgLessonsPerWeek.toFixed(1)} aulas/semana apesar do professor demorar ${Math.round((history.averageLessonDuration - 1) * 100)}% mais.`,
        });
      }
    }

    // If no history checks were applicable, don't penalize
    if (checksPerformed === 0) {
      return { score: 8, insights: [{ type: 'success', message: 'Histórico disponível mas sem adaptações necessárias.' }] };
    }

    return { score: Math.max(0, Math.min(10, score)), insights };
  }

  /**
   * Collects all text content from a plan into a single searchable string.
   */
  private collectPlanText(plan: Plan): string {
    const parts: string[] = [];
    const c = plan.content;

    parts.push(...(c.generalObjectives || []));
    parts.push(...(c.specificObjectives || []));
    parts.push(...(c.topics || []).map(t => t.title || ''));
    parts.push(...(c.topics || []).flatMap(t => t.subtopics || []));
    if (c.weeklyPlan) {
      parts.push(...c.weeklyPlan.map(w => `${w.objectives ?? ''} ${w.contents ?? ''}`));
    }
    if (c.methodology) parts.push(c.methodology);
    if (c.topic?.trim()) parts.push(c.topic);
    if (c.summary) parts.push(c.summary);

    return parts.join(' ');
  }
}
