import { Lesson, LessonStatus } from '@/src/domain/entities/lesson.entity';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { PACING_THRESHOLD, MIN_NOTE_LENGTH_FOR_DIFFICULTY } from '@/src/ai/config';

export interface TeachingHistoryContext {
  completedTopics: string[];
  delayedTopics: string[];
  difficultTopics: string[];
  skippedTopics: string[];
  averageLessonDuration: number; // actual vs planned ratio
  totalLessonsDelivered: number;
  totalLessonsPartial: number;
  totalLessonsSkipped: number;
  recentNotes: string[];         // last 5 teacher notes
}

/**
 * Builds a teaching history context from lesson feedback data.
 * This context is injected into AI plan generation so future
 * plans adapt to real classroom execution.
 */
export class TeachingHistoryService {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly activityRepository: ITeachingActivityRepository,
  ) {}

  async buildContext(
    userId: string,
    subject: string,
  ): Promise<TeachingHistoryContext | null> {
    const lessons = await this.lessonRepository.findCompletedByUser(userId, subject);
    if (lessons.length === 0) return null;

    const completedTopics: string[] = [];
    const delayedTopics: string[] = [];
    const difficultTopics: string[] = [];
    const skippedTopics: string[] = [];
    const recentNotes: string[] = [];
    let totalActual = 0;
    let totalPlanned = 0;
    let delivered = 0;
    let partial = 0;
    let skipped = 0;

    for (const lesson of lessons) {
      const topic = lesson.topic;

      switch (lesson.status) {
        case LessonStatus.DELIVERED:
          completedTopics.push(topic);
          delivered++;
          break;
        case LessonStatus.PARTIALLY_COMPLETED:
          delayedTopics.push(topic);
          partial++;
          break;
        case LessonStatus.NOT_COMPLETED:
          skippedTopics.push(topic);
          skipped++;
          break;
      }

      // Detect difficult topics from notes (require minimum length to avoid noise from "Ok", "Feito")
      if (lesson.teacherNotes && lesson.teacherNotes.trim().length >= MIN_NOTE_LENGTH_FOR_DIFFICULTY) {
        const notes = lesson.teacherNotes.toLowerCase();
        const difficultyMarkers = [
          'dificuldade', 'difícil', 'struggled', 'não compreenderam',
          'complexo', 'confusão', 'repetir',
        ];
        if (difficultyMarkers.some(m => notes.includes(m))) {
          difficultTopics.push(topic);
        }
      }

      // Track duration ratio
      if (lesson.actualDuration) {
        totalActual += lesson.actualDuration;
        totalPlanned += lesson.duration;
      }

      // Collect recent notes (keep last 5)
      if (lesson.teacherNotes && recentNotes.length < 5) {
        recentNotes.push(`[${topic}] ${lesson.teacherNotes}`);
      }
    }

    const avgDurationRatio = totalPlanned > 0
      ? Math.round((totalActual / totalPlanned) * 100) / 100
      : 1;

    return {
      completedTopics: [...new Set(completedTopics)],
      delayedTopics: [...new Set(delayedTopics)],
      difficultTopics: [...new Set(difficultTopics)],
      skippedTopics: [...new Set(skippedTopics)],
      averageLessonDuration: avgDurationRatio,
      totalLessonsDelivered: delivered,
      totalLessonsPartial: partial,
      totalLessonsSkipped: skipped,
      recentNotes,
    };
  }

  /**
   * Aggregate feedback at a higher level (biweekly / trimester).
   * Returns a summary suitable for inclusion in AI prompts.
   */
  async buildFeedbackSummary(
    userId: string,
    subject: string,
  ): Promise<string | null> {
    const ctx = await this.buildContext(userId, subject);
    if (!ctx) return null;
    return this.buildSummaryFromContext(ctx);
  }

  /**
   * Converts structured context into a natural language summary for AI prompts.
   * Useful when you already have a TeachingHistoryContext and want to avoid
   * a second DB query.
   */
  buildSummaryFromContext(ctx: TeachingHistoryContext): string | null {
    const parts: string[] = [];

    if (ctx.totalLessonsDelivered + ctx.totalLessonsPartial + ctx.totalLessonsSkipped === 0) {
      return null;
    }

    parts.push(`══ HISTÓRICO DE EXECUÇÃO DO PROFESSOR ══`);
    parts.push(`Aulas concluídas: ${ctx.totalLessonsDelivered}`);
    parts.push(`Aulas parciais: ${ctx.totalLessonsPartial}`);
    parts.push(`Aulas não realizadas: ${ctx.totalLessonsSkipped}`);

    if (ctx.averageLessonDuration !== 1) {
      const pct = Math.round(ctx.averageLessonDuration * 100);
      if (pct > Math.round(PACING_THRESHOLD * 100)) {
        parts.push(`Ritmo: aulas demoram em média ${pct}% do tempo previsto — AJUSTAR ritmo (mais tempo).`);
      } else if (pct < Math.round((1 - (PACING_THRESHOLD - 1)) * 100)) {
        parts.push(`Ritmo: aulas usam em média ${pct}% do tempo previsto — pode aumentar conteúdo.`);
      }
    }

    if (ctx.delayedTopics.length > 0) {
      parts.push(`\nTemas com atraso (parcialmente dados): ${ctx.delayedTopics.join(', ')}`);
      parts.push(`INSTRUÇÃO: Considerar reforço ou revisão destes temas antes de avançar.`);
    }

    if (ctx.skippedTopics.length > 0) {
      parts.push(`\nTemas não dados: ${ctx.skippedTopics.join(', ')}`);
      parts.push(`INSTRUÇÃO: Incluir estes temas em aulas futuras se o calendário permitir.`);
    }

    if (ctx.difficultTopics.length > 0) {
      parts.push(`\nTemas difíceis (assinalados pelo professor): ${ctx.difficultTopics.join(', ')}`);
      parts.push(`INSTRUÇÃO: Alocar mais tempo e actividades de reforço para estes temas.`);
    }

    if (ctx.recentNotes.length > 0) {
      parts.push(`\nNotas recentes do professor:`);
      ctx.recentNotes.forEach(n => parts.push(`  - ${n}`));
    }

    return parts.join('\n');
  }
}
