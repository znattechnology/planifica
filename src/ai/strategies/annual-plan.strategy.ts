import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { annualPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class AnnualPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.ANNUAL;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.ANNUAL_PLAN}`;

    const parts = [
      `Disciplina: ${context.subject}`,
      `Classe: ${context.grade}`,
      `Ano Lectivo: ${context.dosificacao.academicYear}`,
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
          parts.push(`- ${e.title}: ${e.startDate} a ${e.endDate} (${e.type})`);
        });
        parts.push('Distribui os conteúdos respeitando estas datas.');
      }
    }

    // Dosificação — PRIMARY source for annual plan
    parts.push('', '══ FONTE PRINCIPAL — Dosificação (Plano de Conteúdos Anual) ══');
    parts.push('Todos os temas e objectivos DEVEM derivar exclusivamente desta dosificação:');
    parts.push(JSON.stringify(context.dosificacao.content, null, 2));

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
      'Gera um PLANO ANUAL completo em JSON com:',
      '- generalObjectives: string[] (derivados da dosificação)',
      '- specificObjectives: string[] (por trimestre/unidade)',
      '- competencies: string[]',
      '- topics: { title, subtopics?, duration?, week? }[] (organizados por trimestre)',
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
    const parsed = annualPlanResponseSchema.parse(JSON.parse(raw));
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
