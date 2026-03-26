/**
 * Template do calendário escolar angolano.
 *
 * Estrutura oficial:
 * - 3 trimestres (Setembro–Julho)
 * - Feriados nacionais fixos
 * - Férias inter-trimestrais
 * - Períodos de avaliação no final de cada trimestre
 * - Exames de recurso após avaliações
 * - Jornadas pedagógicas
 *
 * Referência: Calendário Escolar do Ministério da Educação de Angola
 */

import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { CreateCalendarInput } from '@/src/domain/interfaces/repositories/school-calendar.repository';

// ─── Feriados Nacionais de Angola (datas fixas) ──────────

interface HolidayTemplate {
  month: number;
  day: number;
  title: string;
  description: string;
}

const ANGOLA_NATIONAL_HOLIDAYS: HolidayTemplate[] = [
  { month: 1, day: 1, title: 'Ano Novo', description: 'Feriado Nacional' },
  { month: 1, day: 4, title: 'Dia dos Mártires da Repressão Colonial', description: 'Feriado Nacional' },
  { month: 2, day: 4, title: 'Início da Luta Armada', description: 'Feriado Nacional — Aniversário do início da luta armada de libertação nacional' },
  { month: 3, day: 8, title: 'Dia Internacional da Mulher', description: 'Feriado Nacional' },
  { month: 3, day: 23, title: 'Dia da Libertação da África Austral', description: 'Feriado Nacional' },
  { month: 4, day: 4, title: 'Dia da Paz e Reconciliação Nacional', description: 'Feriado Nacional — Assinatura do Memorando de Entendimento do Luena' },
  { month: 5, day: 1, title: 'Dia do Trabalhador', description: 'Feriado Nacional' },
  { month: 9, day: 17, title: 'Dia do Herói Nacional', description: 'Feriado Nacional — Aniversário de Agostinho Neto' },
  { month: 11, day: 2, title: 'Dia dos Finados', description: 'Feriado Nacional' },
  { month: 11, day: 11, title: 'Dia da Independência', description: 'Feriado Nacional — Independência de Angola' },
  { month: 12, day: 25, title: 'Natal', description: 'Feriado Nacional' },
];

// ─── Helpers ──────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function endOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
}

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return Math.ceil(count / 5);
}

// ─── Generator ────────────────────────────────────────────

/**
 * Gera o calendário escolar angolano para um ano académico.
 * @param academicYear - formato "2025/2026"
 * @param userId - ID do utilizador
 * @param schoolName - nome da escola (opcional)
 */
export function generateAngolaCalendar(
  academicYear: string,
  userId: string,
  schoolName?: string,
): Omit<CreateCalendarInput, 'userId'> & { userId: string } {
  const [startYear, endYear] = academicYear.split('/').map(Number);

  if (!startYear || !endYear || endYear !== startYear + 1) {
    throw new Error('Formato de ano académico inválido. Use: YYYY/YYYY (ex: 2025/2026)');
  }

  // ═══════════════════════════════════════════════════════
  //  ESTRUTURA DO ANO LECTIVO
  // ═══════════════════════════════════════════════════════

  const yearStart = d(startYear, 9, 1);   // 1 de Setembro
  const yearEnd = d(endYear, 7, 18);      // 18 de Julho

  // ─── 1.º Trimestre: Setembro – Dezembro ─────────────

  const term1Start = d(startYear, 9, 1);
  const term1ExamStart = d(startYear, 12, 1);
  const term1ExamEnd = d(startYear, 12, 12);
  const term1End = d(startYear, 12, 12);
  const term1MakeupStart = d(startYear, 12, 15);
  const term1MakeupEnd = d(startYear, 12, 19);

  // Férias de Natal: 20 Dez – 7 Jan
  const christmasBreakStart = d(startYear, 12, 20);
  const christmasBreakEnd = d(endYear, 1, 7);

  // ─── 2.º Trimestre: Janeiro – Março ─────────────────

  const term2Start = d(endYear, 1, 8);
  const term2ExamStart = d(endYear, 3, 17);
  const term2ExamEnd = d(endYear, 3, 28);
  const term2End = d(endYear, 3, 28);
  const term2MakeupStart = d(endYear, 3, 31);
  const term2MakeupEnd = d(endYear, 4, 4);

  // Férias da Páscoa: 5 Abril – 20 Abril
  const easterBreakStart = d(endYear, 4, 5);
  const easterBreakEnd = d(endYear, 4, 20);

  // ─── 3.º Trimestre: Abril – Julho ──────────────────

  const term3Start = d(endYear, 4, 21);
  const term3ExamStart = d(endYear, 6, 30);
  const term3ExamEnd = d(endYear, 7, 11);
  const term3End = d(endYear, 7, 11);
  const term3MakeupStart = d(endYear, 7, 14);
  const term3MakeupEnd = d(endYear, 7, 18);

  // ═══════════════════════════════════════════════════════
  //  TRIMESTRES
  // ═══════════════════════════════════════════════════════

  const terms = [
    {
      name: '1.º Trimestre',
      trimester: 1,
      startDate: term1Start,
      endDate: term1End,
      teachingWeeks: countWeekdays(term1Start, d(startYear, 11, 28)), // Semanas de aula (antes das provas)
    },
    {
      name: '2.º Trimestre',
      trimester: 2,
      startDate: term2Start,
      endDate: term2End,
      teachingWeeks: countWeekdays(term2Start, d(endYear, 3, 14)),
    },
    {
      name: '3.º Trimestre',
      trimester: 3,
      startDate: term3Start,
      endDate: term3End,
      teachingWeeks: countWeekdays(term3Start, d(endYear, 6, 27)),
    },
  ];

  // ═══════════════════════════════════════════════════════
  //  EVENTOS
  // ═══════════════════════════════════════════════════════

  const events: CreateCalendarInput['events'] = [];

  // ─── Feriados Nacionais ─────────────────────────────
  for (const h of ANGOLA_NATIONAL_HOLIDAYS) {
    // Verificar se o feriado cai dentro do ano lectivo
    const yearForHoliday = h.month >= 9 ? startYear : endYear;
    const holidayDate = d(yearForHoliday, h.month, h.day);

    if (holidayDate >= yearStart && holidayDate <= yearEnd) {
      events.push({
        title: h.title,
        description: h.description,
        startDate: holidayDate,
        endDate: endOfDay(yearForHoliday, h.month, h.day),
        type: CalendarEventType.NATIONAL_HOLIDAY,
        allDay: true,
      });
    }
  }

  // ─── Férias Inter-trimestrais ───────────────────────
  events.push({
    title: 'Férias de Natal',
    description: 'Período de férias entre o 1.º e 2.º trimestre',
    startDate: christmasBreakStart,
    endDate: christmasBreakEnd,
    type: CalendarEventType.TRIMESTER_BREAK,
    allDay: true,
  });

  events.push({
    title: 'Férias da Páscoa',
    description: 'Período de férias entre o 2.º e 3.º trimestre',
    startDate: easterBreakStart,
    endDate: easterBreakEnd,
    type: CalendarEventType.TRIMESTER_BREAK,
    allDay: true,
  });

  // ─── Períodos de Avaliação ──────────────────────────
  events.push({
    title: 'Provas do 1.º Trimestre',
    description: 'Período de avaliações sumativas do 1.º trimestre',
    startDate: term1ExamStart,
    endDate: term1ExamEnd,
    type: CalendarEventType.EXAM_PERIOD,
    allDay: true,
  });

  events.push({
    title: 'Exames de Recurso — 1.º Trimestre',
    description: 'Período de exames de recurso do 1.º trimestre',
    startDate: term1MakeupStart,
    endDate: term1MakeupEnd,
    type: CalendarEventType.MAKEUP_EXAM,
    allDay: true,
  });

  events.push({
    title: 'Provas do 2.º Trimestre',
    description: 'Período de avaliações sumativas do 2.º trimestre',
    startDate: term2ExamStart,
    endDate: term2ExamEnd,
    type: CalendarEventType.EXAM_PERIOD,
    allDay: true,
  });

  events.push({
    title: 'Exames de Recurso — 2.º Trimestre',
    description: 'Período de exames de recurso do 2.º trimestre',
    startDate: term2MakeupStart,
    endDate: term2MakeupEnd,
    type: CalendarEventType.MAKEUP_EXAM,
    allDay: true,
  });

  events.push({
    title: 'Provas do 3.º Trimestre',
    description: 'Período de avaliações sumativas do 3.º trimestre',
    startDate: term3ExamStart,
    endDate: term3ExamEnd,
    type: CalendarEventType.EXAM_PERIOD,
    allDay: true,
  });

  events.push({
    title: 'Exames de Recurso — 3.º Trimestre',
    description: 'Período de exames de recurso do 3.º trimestre',
    startDate: term3MakeupStart,
    endDate: term3MakeupEnd,
    type: CalendarEventType.MAKEUP_EXAM,
    allDay: true,
  });

  // ─── Jornadas Pedagógicas ──────────────────────────
  events.push({
    title: 'Jornada Pedagógica de Início do Ano',
    description: 'Semana de preparação e planificação do ano lectivo',
    startDate: d(startYear, 8, 25),
    endDate: d(startYear, 8, 29),
    type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
    allDay: true,
  });

  events.push({
    title: 'Jornada Pedagógica — 2.º Trimestre',
    description: 'Avaliação do 1.º trimestre e preparação do 2.º',
    startDate: d(endYear, 1, 6),
    endDate: d(endYear, 1, 7),
    type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
    allDay: true,
  });

  events.push({
    title: 'Jornada Pedagógica — 3.º Trimestre',
    description: 'Avaliação do 2.º trimestre e preparação do 3.º',
    startDate: d(endYear, 4, 18),
    endDate: d(endYear, 4, 20),
    type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
    allDay: true,
  });

  events.push({
    title: 'Jornada Pedagógica de Encerramento',
    description: 'Balanço do ano lectivo e entrega de resultados',
    startDate: d(endYear, 7, 21),
    endDate: d(endYear, 7, 25),
    type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
    allDay: true,
  });

  // ─── Eventos Escolares Comuns ───────────────────────
  events.push({
    title: 'Dia do Professor',
    description: 'Celebração do Dia do Professor em Angola',
    startDate: d(startYear, 11, 24),
    endDate: endOfDay(startYear, 11, 24),
    type: CalendarEventType.SCHOOL_EVENT,
    allDay: true,
  });

  events.push({
    title: 'Dia da Criança Africana',
    description: 'Celebração do Dia da Criança Africana',
    startDate: d(endYear, 6, 16),
    endDate: endOfDay(endYear, 6, 16),
    type: CalendarEventType.SCHOOL_EVENT,
    allDay: true,
  });

  events.push({
    title: 'Dia de África',
    description: 'Celebração do Dia de África',
    startDate: d(endYear, 5, 25),
    endDate: endOfDay(endYear, 5, 25),
    type: CalendarEventType.SCHOOL_EVENT,
    allDay: true,
  });

  return {
    userId,
    academicYear,
    country: 'Angola',
    schoolName,
    startDate: yearStart,
    endDate: yearEnd,
    terms,
    events,
  };
}

/**
 * Calcula estatísticas do calendário.
 */
export function getCalendarStats(terms: { teachingWeeks: number }[], events: { type: string }[]) {
  const totalTeachingWeeks = terms.reduce((sum, t) => sum + t.teachingWeeks, 0);
  const holidays = events.filter(e => e.type === CalendarEventType.NATIONAL_HOLIDAY).length;
  const examPeriods = events.filter(e => e.type === CalendarEventType.EXAM_PERIOD).length;
  const breaks = events.filter(e => e.type === CalendarEventType.TRIMESTER_BREAK).length;

  return {
    totalTeachingWeeks,
    totalHolidays: holidays,
    totalExamPeriods: examPeriods,
    totalBreaks: breaks,
  };
}
