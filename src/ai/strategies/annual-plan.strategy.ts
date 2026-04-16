import { PlanContent, PlanType, AnnualTrimesterSection } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { sanitizeDosificacaoContent, slimDosificacaoContent, DOS_CONTENT_MAX_CHARS } from '@/src/shared/lib/sanitize-dosificacao';
import { annualPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';
import { buildCalendarInstructions } from '@/src/ai/builders/calendar-instruction.builder';

export class AnnualPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.ANNUAL;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.ANNUAL_PLAN}`;

    const parts = [
      `Disciplina: ${sanitizePromptInput(context.subject)}`,
      `Classe: ${sanitizePromptInput(context.grade)}`,
      `Ano Lectivo: ${sanitizePromptInput(context.dosificacao.academicYear)}`,
    ];

    // Calendar context — all terms and events
    if (context.calendarContext) {
      parts.push('', '══ CALENDÁRIO ESCOLAR ══');
      context.calendarContext.terms.forEach(t => {
        parts.push(`${t.trimester}º Trimestre: ${t.startDate} a ${t.endDate} (${t.teachingWeeks} semanas lectivas)`);
      });
      if (context.calendarContext.events.length > 0) {
        parts.push('', 'Feriados e Interrupções:');
        context.calendarContext.events.forEach(e => {
          parts.push(`- ${sanitizePromptInput(e.title)}: ${e.startDate} a ${e.endDate} (${e.type})`);
        });
        parts.push('Distribui os conteúdos respeitando estas datas.');
      }

      // Smart calendar instructions for AI
      const calendarInstructions = buildCalendarInstructions(context.calendarContext);
      if (calendarInstructions) {
        parts.push(calendarInstructions);
      }
    }

    // Dosificação — PRIMARY source for annual plan
    parts.push('', '══ FONTE PRINCIPAL — Dosificação (Plano de Conteúdos Anual) ══');
    parts.push('Todos os temas e objectivos DEVEM derivar exclusivamente desta dosificação:');
    const sanitizedDos = sanitizeDosificacaoContent(context.dosificacao.content);
    const dosJson = JSON.stringify(sanitizedDos, null, 2);
    if (dosJson.length > DOS_CONTENT_MAX_CHARS) {
      parts.push(JSON.stringify(slimDosificacaoContent(sanitizedDos), null, 2));
      parts.push('[NOTA] Dosificação comprimida — apenas campos essenciais incluídos por excesso de conteúdo.');
    } else {
      parts.push(dosJson);
    }

    // Teaching history — adaptive pacing (sanitized: re-injected from stored DB content)
    if (context.teachingHistory) {
      parts.push('', sanitizePromptInput(context.teachingHistory));
    }

    if (context.additionalContext) {
      parts.push('', `Instruções adicionais: ${sanitizePromptInput(context.additionalContext)}`);
    }

    // Calendar term dates for trimester output guidance
    if (context.calendarContext?.terms) {
      parts.push('', '══ DATAS DOS TRIMESTRES (para o campo trimesters[]) ══');
      context.calendarContext.terms.forEach(t => {
        parts.push(`  Trimestre ${t.trimester}: startDate="${t.startDate}", endDate="${t.endDate}", estimatedWeeks=${t.teachingWeeks}`);
      });
    }

    parts.push(
      '',
      '══ FORMATO DE OUTPUT ══',
      'Gera um PLANO ANUAL completo em JSON com TODOS estes campos:',
      '',
      '- generalObjectives: string[]',
      '- specificObjectives: string[]',
      '- competencies: string[]',
      '- methodology: string',
      '- resources: string[]',
      '- assessment: string',
      '',
      '- topics: { title, subtopics?, duration?, week? }[]',
      '  → Lista plana de TODOS os temas do ano (union dos 3 trimestres, para compatibilidade)',
      '',
      '- trimesters: array com EXACTAMENTE 3 entradas:',
      '  [',
      '    {',
      '      "number": 1,',
      '      "startDate": "YYYY-MM-DD",',
      '      "endDate": "YYYY-MM-DD",',
      '      "estimatedWeeks": <número>,',
      '      "topics": [{ "title": "...", "subtopics": [...], "duration": "X semanas" }],',
      '      "generalObjectives": ["..."],',
      '      "specificObjectives": ["..."]',
      '    },',
      '    { "number": 2, ... },',
      '    { "number": 3, ... }',
      '  ]',
      '',
      'REGRAS CRÍTICAS para trimesters[]:',
      '  1. TODOS os temas da dosificação devem aparecer em exactamente UM trimestre',
      '  2. Distribuição equilibrada — nenhum trimestre com >60% dos temas',
      '  3. Respeitar progressão pedagógica (pré-requisitos antes de dependentes)',
      '  4. Usar as datas reais dos trimestres fornecidas acima',
    );

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ];
  }

  parseResponse(raw: string): PlanContent {
    try {
      const parsed = annualPlanResponseSchema.parse(JSON.parse(raw));

      const hasTrimesters = parsed.trimesters && parsed.trimesters.length > 0;

      // Build flat topics[] as union of all trimester topics (backward compat)
      // If AI didn't return trimesters[], use the flat topics[] directly
      const flatTopics = hasTrimesters
        ? (parsed.trimesters as NonNullable<typeof parsed.trimesters>)
            .flatMap(t => t.topics)
            .filter((t): t is NonNullable<typeof t> => t != null && t.title.trim().length > 0)
        : (parsed.topics ?? []).filter(t => t.title.trim().length > 0);

      // Strip ghost topics (title === '') from every trimester's topics array.
      // The Zod schema uses .catch({ title: '' }) — these survive parsing but have no content.
      // They must be removed here, not in flatTopics only, because trimesters[] is the source
      // of truth consumed by TrimesterPlanStrategy and validateAnnualTrimesterCoverage.
      const trimesters = hasTrimesters
        ? (parsed.trimesters as AnnualTrimesterSection[]).map(t => ({
            ...t,
            topics: t.topics.filter(tp => tp.title.trim().length > 0),
          }))
        : undefined;

      const auditNote = hasTrimesters
        ? '[INFO] Plano Anual estruturado por trimestres — fonte determinística para planos trimestrais.'
        : '[AVISO] Plano Anual gerado sem trimesters[] — TrimesterPlanStrategy usará fallback para topics[].';

      return {
        generalObjectives: parsed.generalObjectives.length > 0 ? parsed.generalObjectives : (parsed.objectives || []),
        specificObjectives: parsed.specificObjectives,
        competencies: parsed.competencies,
        topics: flatTopics,
        trimesters,
        methodology: parsed.methodology,
        resources: parsed.resources,
        assessment: parsed.assessment,
        criticalNotes: auditNote,
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
              'Reduza o número de tópicos na dosificação',
              'Divida o plano anual em trimestres separados',
              'Simplifique a dosificação — use apenas campos essenciais (objetivos e conteúdos)',
            ]
          : undefined,
        rawAIOutput: raw,
      };
    }
  }
}
