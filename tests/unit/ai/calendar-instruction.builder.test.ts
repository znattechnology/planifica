import { describe, it, expect } from 'vitest';
import { buildCalendarInstructions } from '@/src/ai/builders/calendar-instruction.builder';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

function makeContext(events: CalendarContext['events'], terms?: CalendarContext['terms']): CalendarContext {
  return {
    terms: terms || [
      { trimester: 1, startDate: '2025-09-01', endDate: '2025-12-12', teachingWeeks: 13 },
      { trimester: 2, startDate: '2026-01-08', endDate: '2026-03-28', teachingWeeks: 10 },
      { trimester: 3, startDate: '2026-04-21', endDate: '2026-07-11', teachingWeeks: 10 },
    ],
    events,
  };
}

describe('buildCalendarInstructions', () => {
  it('should return empty string when no events', () => {
    const ctx = makeContext([]);
    expect(buildCalendarInstructions(ctx)).toBe('');
  });

  it('should generate break instructions for TRIMESTER_BREAK', () => {
    const ctx = makeContext([
      { title: 'Férias de Natal', startDate: '2025-12-20', endDate: '2026-01-07', type: 'TRIMESTER_BREAK' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('FÉRIAS');
    expect(result).toContain('NÃO programar aulas');
    expect(result).toContain('Férias de Natal');
    expect(result).toContain('NÃO contam como semanas lectivas');
  });

  it('should generate holiday instructions for NATIONAL_HOLIDAY', () => {
    const ctx = makeContext([
      { title: 'Dia da Independência', startDate: '2025-11-11', endDate: '2025-11-11', type: 'NATIONAL_HOLIDAY' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('FERIADOS');
    expect(result).toContain('Reduzir');
    expect(result).toContain('Dia da Independência');
  });

  it('should generate exam instructions for EXAM_PERIOD', () => {
    const ctx = makeContext([
      { title: 'Provas 1.º Trim', startDate: '2025-12-01', endDate: '2025-12-05', type: 'EXAM_PERIOD' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('AVALIAÇÃO');
    expect(result).toContain('REVISÃO');
    expect(result).toContain('Provas 1.º Trim');
  });

  it('should generate pedagogical activity instructions', () => {
    const ctx = makeContext([
      { title: 'Jornada Pedagógica', startDate: '2025-08-25', endDate: '2025-08-29', type: 'PEDAGOGICAL_ACTIVITY' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('PEDAGÓGICAS');
    expect(result).toContain('não há aulas para alunos');
  });

  it('should generate school event instructions', () => {
    const ctx = makeContext([
      { title: 'Dia do Professor', startDate: '2025-11-24', endDate: '2025-11-24', type: 'SCHOOL_EVENT' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('EVENTOS ESCOLARES');
    expect(result).toContain('Dia do Professor');
  });

  it('should filter events by trimester when specified', () => {
    const ctx = makeContext([
      { title: 'Feriado T1', startDate: '2025-11-11', endDate: '2025-11-11', type: 'NATIONAL_HOLIDAY' },
      { title: 'Feriado T2', startDate: '2026-02-04', endDate: '2026-02-04', type: 'NATIONAL_HOLIDAY' },
    ]);

    const result = buildCalendarInstructions(ctx, 1);
    expect(result).toContain('Feriado T1');
    expect(result).not.toContain('Feriado T2');
  });

  it('should include effective weeks when provided', () => {
    const ctx = makeContext(
      [{ title: 'Feriado', startDate: '2025-11-11', endDate: '2025-11-11', type: 'NATIONAL_HOLIDAY' }],
    );
    ctx.effectiveTeachingWeeks = 12;

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('12 semanas lectivas efectivas');
  });

  it('should handle multiple event types in same context', () => {
    const ctx = makeContext([
      { title: 'Feriado', startDate: '2025-11-11', endDate: '2025-11-11', type: 'NATIONAL_HOLIDAY' },
      { title: 'Provas', startDate: '2025-12-01', endDate: '2025-12-05', type: 'EXAM_PERIOD' },
      { title: 'Férias', startDate: '2025-12-20', endDate: '2026-01-07', type: 'TRIMESTER_BREAK' },
    ]);

    const result = buildCalendarInstructions(ctx);
    expect(result).toContain('FERIADOS');
    expect(result).toContain('AVALIAÇÃO');
    expect(result).toContain('FÉRIAS');
  });
});
