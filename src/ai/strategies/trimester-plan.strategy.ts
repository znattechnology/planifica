import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { sanitizeDosificacaoContent, slimDosificacaoContent, DOS_CONTENT_MAX_CHARS } from '@/src/shared/lib/sanitize-dosificacao';
import { trimesterPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';
import { buildCalendarInstructions } from '@/src/ai/builders/calendar-instruction.builder';

export class TrimesterPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.TRIMESTER;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.TRIMESTER_PLAN}`;
    const trimNum = context.trimester || 1;

    // Hoist these before their usage sections so they can be referenced in multiple places
    const trimSection = context.parentPlanContent?.trimesters?.find(t => t.number === trimNum);
    let effectiveWeeksForTrimester: number | undefined;
    if (context.calendarContext) {
      const term = context.calendarContext.terms.find(t => t.trimester === trimNum);
      if (term) {
        effectiveWeeksForTrimester = context.calendarContext.effectiveTeachingWeeks || term.teachingWeeks;
      }
    }

    const parts = [
      `Disciplina: ${sanitizePromptInput(context.subject)}`,
      `Classe: ${sanitizePromptInput(context.grade)}`,
      `Ano Lectivo: ${sanitizePromptInput(context.dosificacao.academicYear)}`,
      `Trimestre: ${trimNum}º`,
    ];

    // Calendar context — real dates, holidays, teaching weeks
    if (context.calendarContext) {
      const term = context.calendarContext.terms.find(t => t.trimester === trimNum);
      if (term) {
        parts.push('', `══ CALENDÁRIO ESCOLAR — ${trimNum}º TRIMESTRE ══`);
        parts.push(`Início: ${term.startDate}`);
        parts.push(`Fim: ${term.endDate}`);
        parts.push(`Semanas lectivas reais (descontados feriados): ${effectiveWeeksForTrimester}`);
        parts.push(`OBRIGATÓRIO: O weeklyPlan DEVE ter exactamente ${effectiveWeeksForTrimester} semanas.`);
      }
      const events = context.calendarContext.events;
      if (events.length > 0) {
        parts.push('', 'Feriados e Interrupções:');
        events.forEach(e => {
          parts.push(`- ${sanitizePromptInput(e.title)}: ${e.startDate} a ${e.endDate} (${e.type})`);
        });
        parts.push('NÃO agendar aulas nestas datas.');
      }

      // Smart calendar instructions for AI
      const calendarInstructions = buildCalendarInstructions(context.calendarContext, trimNum);
      if (calendarInstructions) {
        parts.push(calendarInstructions);
      }
    }

    // Pre-computed weekly workload template (deterministic adjustment)
    if (context.adjustedWeekTemplate && context.adjustedWeekTemplate.length > 0) {
      parts.push('', '══ CARGA SEMANAL PRÉ-CALCULADA ══');
      parts.push('O sistema calculou a carga lectiva por semana com base no calendário:');
      const teachingWeeks = context.adjustedWeekTemplate.filter(w => !w.isNonTeaching);
      for (const w of context.adjustedWeekTemplate) {
        const dateRange = `${w.weekStart.substring(5).replace('-', '/')} a ${w.weekEnd.substring(5).replace('-', '/')}`;
        if (w.isNonTeaching) {
          parts.push(`  Semana ${w.weekNumber} (${dateRange}): SEM AULAS${w.impactSummary ? ` — ${w.impactSummary}` : ''}`);
        } else if (w.isExamWeek) {
          parts.push(`  Semana ${w.weekNumber} (${dateRange}): ${w.adjustedLessons} aula(s) [AVALIAÇÃO] — Época de provas. objectives="Revisão Geral / Avaliação", contents="Realização de provas. Sem conteúdos novos."`);
        } else {
          const extra = w.isReviewWeek ? ' [REVISÃO — preparar para provas da semana seguinte]' : '';
          parts.push(`  Semana ${w.weekNumber} (${dateRange}): ${w.adjustedLessons} aula(s)${extra}${w.impactSummary ? ` — ${w.impactSummary}` : ''}`);
        }
      }
      parts.push(`OBRIGATÓRIO: O weeklyPlan deve ter exactamente ${teachingWeeks.length} semanas lectivas.`);
      parts.push('Respeita o número de aulas indicado por semana.');
    }

    // Parent plan content — MANDATORY SOURCE
    if (context.parentPlanContent) {
      if (trimSection) {
        // Task 2: structured annual plan — inject ONLY this trimester's data, no dosificação
        // Task 4: use effectiveWeeksForTrimester (calendar-adjusted) not the AI-stored nominal count
        parts.push('', `══ FONTE PRINCIPAL — Plano Anual › ${trimNum}º Trimestre ══`);
        parts.push('Temas, objectivos e semanas atribuídos EXCLUSIVAMENTE a este trimestre.');
        parts.push('NÃO incluir temas fora desta lista. NÃO inventar temas adicionais.');
        // Guard: trim oversized trimSection to avoid prompt bloat (Part 7)
        const safeTrimObjectives = (trimSection.generalObjectives ?? []).slice(0, 5);
        const safeTrimSpecificObjectives = (trimSection.specificObjectives ?? []).slice(0, 5);
        const safeTrimTopics = (trimSection.topics ?? []).map(t => ({
          title: sanitizePromptInput(t.title),
          ...(t.subtopics && t.subtopics.length > 0
            ? { subtopics: t.subtopics.slice(0, 5).map(s => sanitizePromptInput(s)) }
            : {}),
          ...(t.duration ? { duration: t.duration } : {}),
        }));
        parts.push(JSON.stringify({
          estimatedWeeks: effectiveWeeksForTrimester ?? trimSection.estimatedWeeks,
          generalObjectives: safeTrimObjectives,
          specificObjectives: safeTrimSpecificObjectives,
          topics: safeTrimTopics,
        }, null, 2));
      } else {
        // Fallback: flat topics[] (legacy annual plans without trimesters[])
        parts.push('', '══ FONTE PRINCIPAL DE VERDADE — Plano Anual ══');
        parts.push('Os temas e objectivos abaixo são a ÚNICA fonte. NÃO adicionar temas novos.');
        parts.push(JSON.stringify(context.parentPlanContent, null, 2));
      }
    }

    // Task 2: inject dosificação ONLY when NOT using trimSection (fallback path only)
    // When trimSection is available it is the sole source of truth — dosificação would contaminate
    if (!trimSection) {
      parts.push('', '══ Dosificação (contexto) ══');
      const sanitizedDos = sanitizeDosificacaoContent(context.dosificacao.content);
      const dosJson = JSON.stringify(sanitizedDos, null, 2);
      if (dosJson.length > DOS_CONTENT_MAX_CHARS) {
        parts.push(JSON.stringify(slimDosificacaoContent(sanitizedDos), null, 2));
        parts.push('[NOTA] Dosificação comprimida — apenas campos essenciais incluídos por excesso de conteúdo.');
      } else {
        parts.push(dosJson);
      }
    }

    // Sibling plans — avoid repeating content already covered
    if (context.siblingPlanSummaries && context.siblingPlanSummaries.length > 0) {
      parts.push('', '══ PLANOS JÁ GERADOS — NÃO REPETIR ══');
      context.siblingPlanSummaries.forEach((s, i) => {
        parts.push(`${i + 1}. ${sanitizePromptInput(s.title)}`);
        parts.push(`   Temas cobertos: ${s.topicTitles.map(t => sanitizePromptInput(t)).join(', ')}`);
        parts.push(`   Objectivos cobertos: ${s.generalObjectives.map(o => sanitizePromptInput(o)).join('; ')}`);
      });
      parts.push('Garante progressão lógica. NÃO repitas nenhum dos temas listados acima.');
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
      'Gera um PLANO TRIMESTRAL em JSON com TODOS estes campos:',
      '- generalObjectives: string[] (derivados do plano pai)',
      '- specificObjectives: string[] (derivados do plano pai)',
      '- competencies: string[] (derivadas do plano pai)',
      '- topics: { title, subtopics?, duration?, week? }[] (apenas temas do plano pai para este trimestre)',
      '- weeklyPlan: array com uma entrada por semana lectiva:',
      '  [{ "week": "1ª", "period": "DD/MM A DD/MM/YYYY", "unit": "I", "objectives": "...", "contents": "...", "numLessons": 2 }]',
      '- totalWeeks: number',
      '- totalLessons: number',
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
      const parsed = trimesterPlanResponseSchema.parse(JSON.parse(raw));

      const weeklyPlan = parsed.weeklyPlan.map((w, i) => ({
        ...w,
        week: w.week || `${i + 1}ª`,
      }));

      const totalLessons = parsed.totalLessons
        || weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0);

      return {
        generalObjectives: parsed.generalObjectives.length > 0 ? parsed.generalObjectives : (parsed.objectives || []),
        specificObjectives: parsed.specificObjectives,
        competencies: parsed.competencies,
        topics: (parsed.topics ?? []).filter(t => t.title.trim().length > 0),
        weeklyPlan,
        totalWeeks: parsed.totalWeeks || weeklyPlan.length,
        totalLessons,
        methodology: parsed.methodology,
        resources: parsed.resources || [],
        assessment: parsed.assessment,
        rawAIOutput: raw,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      // Detect likely response truncation: non-empty raw that doesn't end with a closing brace/bracket
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
              'Reduza o número de tópicos do trimestre na dosificação',
              'Reduza o número de semanas do período ou divida o trimestre',
              'Simplifique a dosificação — use apenas campos essenciais (objetivos e conteúdos)',
            ]
          : undefined,
        rawAIOutput: raw,
      };
    }
  }
}
