import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { sanitizeDosificacaoContent, slimDosificacaoContent, DOS_CONTENT_MAX_CHARS } from '@/src/shared/lib/sanitize-dosificacao';
import { biweeklyPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';
import { buildCalendarInstructions } from '@/src/ai/builders/calendar-instruction.builder';

export class BiweeklyPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.BIWEEKLY;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.BIWEEKLY_PLAN}`;

    const parts = [
      `Disciplina: ${sanitizePromptInput(context.subject)}`,
      `Classe: ${sanitizePromptInput(context.grade)}`,
      `Ano Lectivo: ${sanitizePromptInput(context.dosificacao.academicYear)}`,
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
        parts.push(`  Unidade: ${sanitizePromptInput(w.unit)}`);
        parts.push(`  Objectivos: ${sanitizePromptInput(w.objectives)}`);
        parts.push(`  Conteúdos: ${sanitizePromptInput(w.contents)}`);
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
    const sanitizedDosBiweekly = sanitizeDosificacaoContent(context.dosificacao.content);
    const dosJsonBiweekly = JSON.stringify(sanitizedDosBiweekly, null, 2);
    if (dosJsonBiweekly.length > DOS_CONTENT_MAX_CHARS) {
      parts.push(JSON.stringify(slimDosificacaoContent(sanitizedDosBiweekly), null, 2));
      parts.push('[NOTA] Dosificação comprimida — apenas campos essenciais incluídos por excesso de conteúdo.');
    } else {
      parts.push(dosJsonBiweekly);
    }

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
          parts.push(`- ${sanitizePromptInput(e.title)}: ${e.startDate} a ${e.endDate}`);
        });
        parts.push('NÃO agendar aulas nestas datas.');
      }

      // Smart calendar instructions for AI
      const calendarInstructions = buildCalendarInstructions(context.calendarContext, context.trimester);
      if (calendarInstructions) {
        parts.push(calendarInstructions);
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

    // Teaching history — adaptive pacing (sanitized: re-injected from stored DB content)
    if (context.teachingHistory) {
      parts.push('', sanitizePromptInput(context.teachingHistory));
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
    try {
      const parsed = biweeklyPlanResponseSchema.parse(JSON.parse(raw));
      return {
        generalObjectives: parsed.generalObjectives.length > 0 ? parsed.generalObjectives : (parsed.objectives || []),
        specificObjectives: parsed.specificObjectives,
        competencies: parsed.competencies,
        topics: (parsed.topics ?? []).filter(t => t.title.trim().length > 0),
        methodology: parsed.methodology,
        resources: parsed.resources,
        assessment: parsed.assessment,
        rawAIOutput: raw,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const isLikelyTruncated = raw.length > 500 && !/[}\]]\s*$/.test(raw.trimEnd());
      return {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [],
        criticalNotes: isLikelyTruncated
          ? 'Plano extenso para processamento.'
          : `Erro ao processar resposta da IA: ${errorMessage.substring(0, 500)}`,
        suggestions: isLikelyTruncated
          ? [
              'Reduza os conteúdos do plano trimestral pai',
              'Gere planos quinzenais com menos semanas por vez',
            ]
          : undefined,
        rawAIOutput: raw,
      };
    }
  }
}
