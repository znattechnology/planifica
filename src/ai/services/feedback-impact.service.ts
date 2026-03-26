import { PlanContent, WeeklyPlanItem } from '@/src/domain/entities/plan.entity';
import { TeachingHistoryContext } from './teaching-history.service';
import { PACING_THRESHOLD, FAST_PACING_THRESHOLD, normalizeText } from '@/src/ai/config';

export interface AdaptationChange {
  type: 'pacing' | 'reinforcement' | 'skipped' | 'calendar' | 'workload';
  message: string;
}

export interface FeedbackImpactReport {
  hasAdaptations: boolean;
  changes: AdaptationChange[];
}

/**
 * Compares a generated plan against its parent and teaching history
 * to detect and explain what the AI adapted and why.
 */
export class FeedbackImpactService {

  analyze(
    generatedContent: PlanContent,
    parentContent?: PlanContent,
    teachingHistory?: TeachingHistoryContext,
  ): FeedbackImpactReport {
    const changes: AdaptationChange[] = [];

    if (teachingHistory) {
      changes.push(...this.detectPacingChanges(teachingHistory));
      changes.push(...this.detectReinforcementChanges(generatedContent, teachingHistory));
      changes.push(...this.detectSkippedContentChanges(generatedContent, teachingHistory));
    }

    if (parentContent && generatedContent.weeklyPlan) {
      changes.push(...this.detectWorkloadChanges(generatedContent, parentContent));
    }

    return {
      hasAdaptations: changes.length > 0,
      changes,
    };
  }

  private detectPacingChanges(history: TeachingHistoryContext): AdaptationChange[] {
    const changes: AdaptationChange[] = [];

    if (history.averageLessonDuration > PACING_THRESHOLD) {
      const pct = Math.round((history.averageLessonDuration - 1) * 100);
      changes.push({
        type: 'pacing',
        message: `Notámos que as suas aulas demoram em média ${pct}% mais do que o previsto — ajustámos o ritmo para que tenha tempo suficiente por tema, sem correr.`,
      });
    } else if (history.averageLessonDuration < FAST_PACING_THRESHOLD) {
      const pct = Math.round((1 - history.averageLessonDuration) * 100);
      changes.push({
        type: 'pacing',
        message: `As suas aulas tendem a ser ${pct}% mais rápidas — aumentámos ligeiramente o conteúdo por aula para aproveitar melhor o tempo.`,
      });
    }

    if (history.totalLessonsPartial > 0) {
      changes.push({
        type: 'pacing',
        message: `Verificámos que ${history.totalLessonsPartial} aula(s) ficaram incompletas — reduzimos o ritmo para que consiga cobrir os conteúdos com mais tranquilidade.`,
      });
    }

    return changes;
  }

  private detectReinforcementChanges(
    content: PlanContent,
    history: TeachingHistoryContext,
  ): AdaptationChange[] {
    const changes: AdaptationChange[] = [];

    if (history.difficultTopics.length === 0) return changes;

    // Check if generated content includes any of the difficult topics
    const generatedTopics = (content.topics || []).map(t => normalizeText(t.title));
    const weeklyContents = (content.weeklyPlan || []).map(w => normalizeText(w.contents ?? ''));

    for (const difficult of history.difficultTopics) {
      const dl = normalizeText(difficult);
      const inTopics = generatedTopics.some(t => t.includes(dl) || dl.includes(t));
      const inWeekly = weeklyContents.some(c => c.includes(dl) || dl.includes(c));

      if (inTopics || inWeekly) {
        changes.push({
          type: 'reinforcement',
          message: `Percebemos que "${difficult}" foi um tema com dificuldades — dedicámos mais tempo para garantir que os alunos absorvem bem o conteúdo.`,
        });
      }
    }

    if (history.difficultTopics.length > 0 && changes.filter(c => c.type === 'reinforcement').length === 0) {
      changes.push({
        type: 'reinforcement',
        message: `Detectámos ${history.difficultTopics.length} tema(s) onde os alunos tiveram dificuldades: ${history.difficultTopics.join(', ')}. A distribuição de tempo foi ajustada em conformidade.`,
      });
    }

    return changes;
  }

  private detectSkippedContentChanges(
    content: PlanContent,
    history: TeachingHistoryContext,
  ): AdaptationChange[] {
    const changes: AdaptationChange[] = [];

    if (history.skippedTopics.length === 0) return changes;

    const generatedTopics = (content.topics || []).map(t => normalizeText(t.title));
    const weeklyContents = (content.weeklyPlan || []).map(w => normalizeText(w.contents ?? ''));

    const rescheduled: string[] = [];
    const stillMissing: string[] = [];

    for (const skipped of history.skippedTopics) {
      const sl = normalizeText(skipped);
      const found = generatedTopics.some(t => t.includes(sl) || sl.includes(t))
        || weeklyContents.some(c => c.includes(sl) || sl.includes(c));

      if (found) {
        rescheduled.push(skipped);
      } else {
        stillMissing.push(skipped);
      }
    }

    if (rescheduled.length > 0) {
      changes.push({
        type: 'skipped',
        message: `Os conteúdos "${rescheduled.join('", "')}" não foram dados anteriormente — reagendámos neste plano para que os alunos não fiquem com lacunas.`,
      });
    }

    if (stillMissing.length > 0) {
      changes.push({
        type: 'skipped',
        message: `Os temas "${stillMissing.join('", "')}" não couberam neste plano por falta de semanas — considere abordá-los de forma transversal ou no próximo período.`,
      });
    }

    return changes;
  }

  private detectWorkloadChanges(
    content: PlanContent,
    parentContent: PlanContent,
  ): AdaptationChange[] {
    const changes: AdaptationChange[] = [];

    const parentWeeks = parentContent.weeklyPlan?.length || 0;
    const generatedWeeks = content.weeklyPlan?.length || 0;

    if (parentWeeks > 0 && generatedWeeks > 0 && generatedWeeks !== parentWeeks) {
      const diff = generatedWeeks - parentWeeks;
      if (diff > 0) {
        changes.push({
          type: 'workload',
          message: `Adicionámos ${diff} semana(s) em relação ao plano original para que os conteúdos fiquem melhor distribuídos e não haja semanas sobrecarregadas.`,
        });
      } else {
        changes.push({
          type: 'workload',
          message: `Reduzimos ${Math.abs(diff)} semana(s) em relação ao plano original, alinhando com o calendário escolar real.`,
        });
      }
    }

    return changes;
  }
}
