import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { biweeklyPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class BiweeklyPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.BIWEEKLY;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.BIWEEKLY_PLAN}`;

    const parts = [
      `Disciplina: ${context.subject}`,
      `Classe: ${context.grade}`,
      `Ano Lectivo: ${context.dosificacao.academicYear}`,
    ];

    if (context.trimester) parts.push(`Trimestre: ${context.trimester}º`);
    if (context.week) parts.push(`Semana inicial: ${context.week}`);

    // Focus week data — PRIMARY source when available
    if (context.focusWeekData && context.focusWeekData.weeks && context.focusWeekData.weeks.length > 0) {
      parts.push('', '══ DADOS ESPECÍFICOS DAS SEMANAS — FONTE PRINCIPAL ══');
      parts.push(`Semanas ${context.focusWeekData.weekIndex + 1} a ${context.focusWeekData.weekIndex + context.focusWeekData.weeks.length} de ${context.focusWeekData.totalWeeksInParent} do plano trimestral.`);
      parts.push('O plano quinzenal DEVE cobrir EXACTAMENTE estes objectivos e conteúdos:');
      parts.push('');
      context.focusWeekData.weeks.forEach(w => {
        parts.push(`Semana ${w.week}${w.period ? ` (${w.period})` : ''}:`);
        parts.push(`  Unidade: ${w.unit}`);
        parts.push(`  Objectivos: ${w.objectives}`);
        parts.push(`  Conteúdos: ${w.contents}`);
        parts.push(`  Nº aulas: ${w.numLessons}`);
        parts.push('');
      });
      parts.push('NÃO adicionar temas ou objectivos fora dos listados acima.');
    }

    // Parent plan as secondary context
    if (context.parentPlanContent) {
      parts.push('', '══ Plano Trimestral (contexto completo) ══');
      parts.push(JSON.stringify(context.parentPlanContent, null, 2));
    }

    // Dosificação as tertiary reference
    parts.push('', '══ Dosificação (referência) ══');
    parts.push(JSON.stringify(context.dosificacao.content, null, 2));

    // Calendar context
    if (context.calendarContext) {
      const trimNum = context.trimester || 1;
      const term = context.calendarContext.terms.find(t => t.trimester === trimNum);
      if (term) {
        parts.push('', `Calendário — ${trimNum}º Trimestre: ${term.startDate} a ${term.endDate}`);
      }
      const events = context.calendarContext.events;
      if (events.length > 0) {
        parts.push('Feriados:');
        events.forEach(e => {
          parts.push(`- ${e.title}: ${e.startDate} a ${e.endDate}`);
        });
        parts.push('NÃO agendar aulas nestas datas.');
      }
    }

    // Sibling plans
    if (context.siblingPlanSummaries && context.siblingPlanSummaries.length > 0) {
      parts.push('', '══ PLANOS QUINZENAIS JÁ GERADOS — NÃO REPETIR ══');
      context.siblingPlanSummaries.forEach((s, i) => {
        parts.push(`${i + 1}. ${sanitizePromptInput(s.title)} — Temas: ${s.topicTitles.map(t => sanitizePromptInput(t)).join(', ')}`);
      });
      parts.push('Garante continuidade e progressão.');
    }

    // Teaching history — adaptive pacing
    if (context.teachingHistory) {
      parts.push('', context.teachingHistory);
    }

    if (context.additionalContext) {
      parts.push('', `Instruções adicionais: ${sanitizePromptInput(context.additionalContext)}`);
    }

    parts.push(
      '',
      '══ FORMATO DE OUTPUT ══',
      'Gera um PLANO QUINZENAL (2 semanas) em JSON com:',
      '- generalObjectives: string[] (derivados dos dados semanais/plano pai)',
      '- specificObjectives: string[] (objectivos específicos por aula)',
      '- competencies: string[]',
      '- topics: { title, subtopics?, duration?, week? }[] (apenas temas das semanas indicadas)',
      '- methodology: string',
      '- resources: string[]',
      '- assessment: string',
    );

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ];
  }

  parseResponse(raw: string): PlanContent {
    const parsed = biweeklyPlanResponseSchema.parse(JSON.parse(raw));
    return {
      generalObjectives: parsed.generalObjectives.length > 0 ? parsed.generalObjectives : (parsed.objectives || []),
      specificObjectives: parsed.specificObjectives,
      competencies: parsed.competencies,
      topics: parsed.topics,
      methodology: parsed.methodology,
      resources: parsed.resources,
      assessment: parsed.assessment,
      rawAIOutput: raw,
    };
  }
}
