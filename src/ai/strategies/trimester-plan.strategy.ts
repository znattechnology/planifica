import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { trimesterPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class TrimesterPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.TRIMESTER;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.TRIMESTER_PLAN}`;
    const trimNum = context.trimester || 1;

    const parts = [
      `Disciplina: ${context.subject}`,
      `Classe: ${context.grade}`,
      `Ano Lectivo: ${context.dosificacao.academicYear}`,
      `Trimestre: ${trimNum}º`,
    ];

    // Calendar context — real dates, holidays, teaching weeks
    if (context.calendarContext) {
      const term = context.calendarContext.terms.find(t => t.trimester === trimNum);
      if (term) {
        const effectiveWeeks = context.calendarContext.effectiveTeachingWeeks || term.teachingWeeks;
        parts.push('', `══ CALENDÁRIO ESCOLAR — ${trimNum}º TRIMESTRE ══`);
        parts.push(`Início: ${term.startDate}`);
        parts.push(`Fim: ${term.endDate}`);
        parts.push(`Semanas lectivas reais (descontados feriados): ${effectiveWeeks}`);
        parts.push(`OBRIGATÓRIO: O weeklyPlan DEVE ter exactamente ${effectiveWeeks} semanas.`);
      }
      const events = context.calendarContext.events;
      if (events.length > 0) {
        parts.push('', 'Feriados e Interrupções:');
        events.forEach(e => {
          parts.push(`- ${e.title}: ${e.startDate} a ${e.endDate} (${e.type})`);
        });
        parts.push('NÃO agendar aulas nestas datas.');
      }
    }

    // Parent plan content — MANDATORY SOURCE
    if (context.parentPlanContent) {
      parts.push('', '══ FONTE PRINCIPAL DE VERDADE — Plano Anual ══');
      parts.push('Os temas e objectivos abaixo são a ÚNICA fonte. NÃO adicionar temas novos.');
      parts.push(JSON.stringify(context.parentPlanContent, null, 2));
    }

    // Dosificação as secondary reference
    parts.push('', '══ Dosificação (contexto) ══');
    parts.push(JSON.stringify(context.dosificacao.content, null, 2));

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

    // Teaching history — adaptive pacing based on real execution
    if (context.teachingHistory) {
      parts.push('', context.teachingHistory);
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
      topics: parsed.topics,
      weeklyPlan,
      totalWeeks: parsed.totalWeeks || weeklyPlan.length,
      totalLessons,
      methodology: parsed.methodology,
      resources: parsed.resources || [],
      assessment: parsed.assessment,
      rawAIOutput: raw,
    };
  }
}
