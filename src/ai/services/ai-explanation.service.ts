import { Plan, PlanType, PlanContent, PlanQualityScores } from '@/src/domain/entities/plan.entity';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { TeachingHistoryContext } from './teaching-history.service';

export interface ExplanationFactor {
  id: string;
  label: string;
  active: boolean;
  detail?: string;
}

export interface PlanExplanation {
  explanation: string;
  factors: ExplanationFactor[];
}

/**
 * Generates human-readable explanations of AI plan generation decisions.
 * Makes the AI transparent and trustworthy to teachers.
 */
export class AIExplanationService {

  explain(
    plan: Plan,
    parentPlan?: Plan,
    teachingHistory?: TeachingHistoryContext,
    calendarContext?: CalendarContext,
    qualityScores?: PlanQualityScores,
  ): PlanExplanation {
    const factors = this.identifyFactors(plan, parentPlan, teachingHistory, calendarContext);
    const explanation = this.buildExplanation(plan, factors, teachingHistory, calendarContext, qualityScores);

    return { explanation, factors };
  }

  private identifyFactors(
    plan: Plan,
    parent?: Plan,
    history?: TeachingHistoryContext,
    calendar?: CalendarContext,
  ): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];

    // Factor 1: Parent plan
    const hasParent = !!parent;
    factors.push({
      id: 'parent_plan',
      label: 'Plano pai',
      active: hasParent,
      detail: hasParent
        ? `Derivado do plano "${parent!.title}" — temas e objectivos vêm exclusivamente desta fonte.`
        : 'Sem plano pai — gerado directamente da dosificação.',
    });

    // Factor 2: Calendar
    const hasCalendar = !!calendar && calendar.terms.length > 0;
    factors.push({
      id: 'school_calendar',
      label: 'Calendário escolar',
      active: hasCalendar,
      detail: hasCalendar
        ? `Calendário com ${calendar!.terms.length} trimestre(s) e ${calendar!.events.length} evento(s). Datas e semanas lectivas respeitadas.`
        : 'Sem calendário — usado o calendário angolano padrão.',
    });

    // Factor 3: Teaching history
    const hasHistory = !!history && (history.totalLessonsDelivered + history.totalLessonsPartial + history.totalLessonsSkipped) > 0;
    factors.push({
      id: 'teaching_history',
      label: 'Histórico de execução',
      active: hasHistory,
      detail: hasHistory
        ? `${history!.totalLessonsDelivered} aula(s) dada(s), ${history!.totalLessonsPartial} parcial(ais), ${history!.totalLessonsSkipped} não realizada(s). Ritmo ajustado.`
        : 'Sem histórico — primeira geração para esta disciplina.',
    });

    // Factor 4: Difficulty detection
    const hasDifficulty = !!history && history.difficultTopics.length > 0;
    factors.push({
      id: 'difficulty_detection',
      label: 'Dificuldades detectadas',
      active: hasDifficulty,
      detail: hasDifficulty
        ? `Temas com dificuldade: ${history!.difficultTopics.join(', ')}. Mais tempo alocado.`
        : undefined,
    });

    // Factor 5: Workload balance
    const hasWeeklyPlan = !!plan.content.weeklyPlan && plan.content.weeklyPlan.length > 0;
    factors.push({
      id: 'workload_balance',
      label: 'Distribuição de carga',
      active: hasWeeklyPlan,
      detail: hasWeeklyPlan
        ? `${plan.content.weeklyPlan!.length} semanas com distribuição equilibrada de conteúdos.`
        : undefined,
    });

    // Factor 6: Sibling awareness (inferred from content)
    factors.push({
      id: 'sibling_awareness',
      label: 'Continuidade com planos irmãos',
      active: plan.type === PlanType.TRIMESTER || plan.type === PlanType.BIWEEKLY,
      detail: 'Temas já cobertos por planos irmãos foram excluídos para evitar repetição.',
    });

    return factors;
  }

  private buildExplanation(
    plan: Plan,
    factors: ExplanationFactor[],
    history?: TeachingHistoryContext,
    calendar?: CalendarContext,
    quality?: PlanQualityScores,
  ): string {
    const parts: string[] = [];
    const typeLabel = this.getTypeLabel(plan.type);

    // Opening
    parts.push(`Este ${typeLabel} foi gerado pela IA`);

    // Parent context
    const parentFactor = factors.find(f => f.id === 'parent_plan');
    if (parentFactor?.active) {
      parts[0] += ` com base no plano pai`;
    } else {
      parts[0] += ` com base na dosificação`;
    }

    // Calendar context
    const calFactor = factors.find(f => f.id === 'school_calendar');
    if (calFactor?.active && calendar) {
      const trimNum = plan.trimester || 1;
      const term = calendar.terms.find(t => t.trimester === trimNum);
      if (term) {
        parts[0] += `, respeitando ${term.teachingWeeks} semanas lectivas do ${trimNum}º trimestre`;
      }
    }

    parts[0] += '.';

    // Teaching history
    if (history && (history.totalLessonsDelivered + history.totalLessonsPartial + history.totalLessonsSkipped) > 0) {
      const histParts: string[] = [];

      if (history.averageLessonDuration > 1.15) {
        histParts.push('o ritmo foi reduzido para acomodar o tempo real das aulas');
      } else if (history.averageLessonDuration < 0.85) {
        histParts.push('o conteúdo por aula foi aumentado dado o ritmo acelerado');
      }

      if (history.difficultTopics.length > 0) {
        histParts.push(`mais tempo foi alocado para temas difíceis (${history.difficultTopics.slice(0, 3).join(', ')})`);
      }

      if (history.skippedTopics.length > 0) {
        histParts.push(`conteúdos não dados foram redistribuídos`);
      }

      if (histParts.length > 0) {
        parts.push(`Com base no seu histórico de aulas, ${histParts.join(', ')}.`);
      }
    }

    // Quality scores
    if (quality) {
      if (quality.overallScore >= 8) {
        parts.push(`A qualidade geral do plano é elevada (${quality.overallScore}/10).`);
      } else if (quality.overallScore >= 5) {
        parts.push(`A qualidade do plano é razoável (${quality.overallScore}/10) — reveja os avisos acima.`);
      }
    }

    return parts.join(' ');
  }

  private getTypeLabel(type: PlanType): string {
    const labels: Record<PlanType, string> = {
      [PlanType.ANNUAL]: 'plano anual',
      [PlanType.TRIMESTER]: 'plano trimestral',
      [PlanType.BIWEEKLY]: 'plano quinzenal',
      [PlanType.LESSON]: 'plano de aula',
    };
    return labels[type] || 'plano';
  }
}
