import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { SYSTEM_PROMPTS } from '@/src/ai/prompts/system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IPlanGenerationStrategy, PlanGenerationContext } from './plan-generation.strategy';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';
import { lessonPlanResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class LessonPlanStrategy implements IPlanGenerationStrategy {
  readonly type = PlanType.LESSON;

  buildPrompt(context: PlanGenerationContext): AIMessage[] {
    const systemPrompt = `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${SYSTEM_PROMPTS.LESSON_PLAN}`;

    const parts = [
      `Disciplina: ${context.subject}`,
      `Classe: ${context.grade}`,
      `Ano Lectivo: ${context.dosificacao.academicYear}`,
    ];

    if (context.week) {
      parts.push(`Semana: ${context.week}`);
    }

    // Focus week data — PRIMARY source when available
    if (context.focusWeekData && context.focusWeekData.weeks && context.focusWeekData.weeks.length > 0) {
      const weekData = context.focusWeekData.weeks[0];
      parts.push('', '══ DADOS ESPECÍFICOS DA SEMANA — FONTE PRINCIPAL ══');
      parts.push(`Semana ${weekData.week}${weekData.period ? ` (${weekData.period})` : ''}`);
      parts.push(`Unidade didáctica: ${weekData.unit}`);
      parts.push(`Objectivos: ${weekData.objectives}`);
      parts.push(`Conteúdos: ${weekData.contents}`);
      parts.push(`Nº aulas nesta semana: ${weekData.numLessons}`);
      parts.push('');
      parts.push('O plano de aula DEVE:');
      parts.push('- Ter como tema um dos conteúdos listados acima');
      parts.push('- Usar os objectivos listados acima como objectivos gerais');
      parts.push('- Pertencer à unidade didáctica indicada');
      parts.push('- NÃO introduzir temas fora dos conteúdos listados');
    }

    // Parent plan as secondary context
    if (context.parentPlanContent) {
      parts.push('', '══ Plano pai (contexto completo) ══');
      parts.push(JSON.stringify(context.parentPlanContent, null, 2));
    }

    // Dosificação as tertiary reference
    parts.push('', '══ Dosificação (referência) ══');
    parts.push(JSON.stringify(context.dosificacao.content, null, 2));

    // Calendar context
    if (context.calendarContext) {
      const events = context.calendarContext.events;
      if (events.length > 0) {
        parts.push('', 'Feriados e Interrupções:');
        events.forEach(e => {
          parts.push(`- ${e.title}: ${e.startDate} a ${e.endDate}`);
        });
      }
    }

    // Sibling lessons
    if (context.siblingPlanSummaries && context.siblingPlanSummaries.length > 0) {
      parts.push('', '══ PLANOS DE AULA JÁ GERADOS — NÃO REPETIR ══');
      context.siblingPlanSummaries.forEach((s, i) => {
        parts.push(`${i + 1}. ${sanitizePromptInput(s.title)} — Tema: ${s.topicTitles.map(t => sanitizePromptInput(t)).join(', ')}`);
      });
      parts.push('A próxima aula deve dar continuidade, não repetir.');
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
      'Gera um PLANO DE AULA COMPLETO no formato MOD.06.DEM.01 angolano em JSON com TODOS estes campos:',
      '- topic: string (DEVE vir dos dados semanais/plano pai)',
      '- duration: number (45 ou 90 minutos)',
      '- lessonType: string ("Teórica", "Prática", "Teórico-Prática")',
      '- didacticUnit: string (DEVE corresponder à unidade dos dados semanais)',
      '- summary: string (pontos principais separados por \\n)',
      '- generalObjectives: string[] (derivados dos dados semanais/plano pai)',
      '- specificObjectives: string[] ("Ao final da aula o aluno deverá ser capaz de...")',
      '- competencies: string[]',
      '- topics: { title, subtopics? }[]',
      '- lessonPhases: EXACTAMENTE 4 fases:',
      '  [',
      '    { "name": "Início (Motivação)", "duration": "5 min", "content": "...", "activities": [...], "methods": "...", "resources": "...", "assessment": "..." },',
      '    { "name": "Desenvolvimento", "duration": "25 min", "content": "...", "activities": [...], "methods": "...", "resources": "...", "assessment": "..." },',
      '    { "name": "Conclusão (Verificação e Síntese)", "duration": "10 min", "content": "...", "activities": [...], "methods": "...", "resources": "...", "assessment": "..." },',
      '    { "name": "Orientação da Tarefa (TPC)", "duration": "5 min", "content": "...", "activities": [...], "methods": "...", "resources": "...", "assessment": "" }',
      '  ]',
      '- methodology: string',
      '- resources: string[]',
      '- assessment: string',
      '- homework: string',
      '- bibliography: string[]',
    );

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ];
  }

  parseResponse(raw: string): PlanContent {
    const parsed = lessonPlanResponseSchema.parse(JSON.parse(raw));

    const summary = parsed.summary
      || parsed.topics.map((t, i) => `${i + 1}. ${t.title}`).join('\n')
      || '';

    const didacticUnit = parsed.didacticUnit || parsed.topic || '';

    return {
      generalObjectives: parsed.generalObjectives.length > 0 ? parsed.generalObjectives : (parsed.objectives || []),
      specificObjectives: parsed.specificObjectives,
      competencies: parsed.competencies,
      topics: parsed.topics,
      topic: parsed.topic,
      duration: parsed.duration,
      lessonType: parsed.lessonType,
      didacticUnit,
      summary,
      lessonPhases: parsed.lessonPhases,
      methodology: parsed.methodology,
      resources: parsed.resources || [],
      assessment: parsed.assessment,
      homework: parsed.homework,
      bibliography: parsed.bibliography,
      rawAIOutput: raw,
    };
  }
}
