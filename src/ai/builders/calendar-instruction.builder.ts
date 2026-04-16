import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';

/**
 * Build pedagogically-aware instructions for the AI based on calendar events.
 *
 * This enriches (NOT replaces) the existing calendar context in prompts.
 * The AI receives both the raw event list AND these smart instructions.
 */
export function buildCalendarInstructions(calendarContext: CalendarContext, trimester?: number): string {
  if (!calendarContext.events || calendarContext.events.length === 0) {
    return '';
  }

  const lines: string[] = ['', '══ REGRAS DO CALENDÁRIO ESCOLAR ══'];

  // Filter events relevant to the trimester if specified
  let relevantEvents = calendarContext.events;
  if (trimester) {
    const term = calendarContext.terms.find(t => t.trimester === trimester);
    if (term) {
      relevantEvents = calendarContext.events.filter(e => {
        return e.endDate >= term.startDate && e.startDate <= term.endDate;
      });
    }
  }

  if (relevantEvents.length === 0) {
    return '';
  }

  // Group events by type and generate specific instructions
  const byType = groupByType(relevantEvents);

  // BREAKS → absolute block
  const breaks = byType[CalendarEventType.TRIMESTER_BREAK] || [];
  if (breaks.length > 0) {
    lines.push('');
    lines.push('FÉRIAS / INTERRUPÇÕES (NÃO programar aulas):');
    for (const e of breaks) {
      lines.push(`  - ${e.title}: ${e.startDate} a ${e.endDate}`);
    }
    lines.push('  → OBRIGATÓRIO: Estas semanas NÃO contam como semanas lectivas.');
  }

  // HOLIDAYS → reduce lessons
  const holidays = [
    ...(byType[CalendarEventType.NATIONAL_HOLIDAY] || []),
    ...(byType[CalendarEventType.SCHOOL_HOLIDAY] || []),
  ];
  if (holidays.length > 0) {
    lines.push('');
    lines.push('FERIADOS (reduzir carga lectiva na semana):');
    for (const e of holidays) {
      lines.push(`  - ${e.title}: ${e.startDate}`);
    }
    lines.push('  → Reduzir o número de aulas na semana do feriado.');
    lines.push('  → NÃO agendar aulas nestes dias.');
  }

  // EXAMS → mark exam weeks + add review in week before
  const exams = [
    ...(byType[CalendarEventType.EXAM_PERIOD] || []),
    ...(byType[CalendarEventType.MAKEUP_EXAM] || []),
  ];
  if (exams.length > 0) {
    lines.push('');
    lines.push('PERÍODOS DE AVALIAÇÃO:');
    for (const e of exams) {
      lines.push(`  - ${e.title}: ${e.startDate} a ${e.endDate}`);
    }
    lines.push('  → Na semana das provas [REVISÃO]: objectives = "Revisão Geral / Época de Avaliação", contents = "Realização de provas escritas/orais. Sem introdução de conteúdos novos."');
    lines.push('  → Na semana IMEDIATAMENTE ANTERIOR às provas: objectives e contents devem incluir "Revisão dos temas para preparação das provas".');
    lines.push('  → NÃO introduzir matéria nova na semana das provas.');
  }

  // PEDAGOGICAL → teachers busy
  const pedagogical = byType[CalendarEventType.PEDAGOGICAL_ACTIVITY] || [];
  if (pedagogical.length > 0) {
    lines.push('');
    lines.push('JORNADAS PEDAGÓGICAS (sem aulas para alunos):');
    for (const e of pedagogical) {
      lines.push(`  - ${e.title}: ${e.startDate} a ${e.endDate}`);
    }
    lines.push('  → Professores em formação — não há aulas para alunos.');
  }

  // SCHOOL EVENTS → possible reduction
  const schoolEvents = byType[CalendarEventType.SCHOOL_EVENT] || [];
  if (schoolEvents.length > 0) {
    lines.push('');
    lines.push('EVENTOS ESCOLARES (possível redução de carga):');
    for (const e of schoolEvents) {
      lines.push(`  - ${e.title}: ${e.startDate}`);
    }
    lines.push('  → Considerar possível redução de aulas nestes dias.');
  }

  // Summary instruction
  if (calendarContext.effectiveTeachingWeeks) {
    lines.push('');
    lines.push(`RESUMO: O trimestre tem ${calendarContext.effectiveTeachingWeeks} semanas lectivas efectivas (já descontados feriados e interrupções).`);
    lines.push('Distribui os conteúdos uniformemente por estas semanas.');
  }

  return lines.join('\n');
}

// ─── Internal helpers ────────────────────────────────────

type EventEntry = CalendarContext['events'][number];

function groupByType(events: EventEntry[]): Record<string, EventEntry[]> {
  const groups: Record<string, EventEntry[]> = {};
  for (const e of events) {
    if (!groups[e.type]) groups[e.type] = [];
    groups[e.type].push(e);
  }
  return groups;
}
