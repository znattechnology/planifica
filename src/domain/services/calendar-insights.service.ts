import type { SchoolCalendar, CalendarEvent } from '@/src/domain/entities/school-calendar.entity';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { CalendarImpactService } from './calendar-impact.service';

// ─── Types ───────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'error';

export interface CalendarInsight {
  severity: InsightSeverity;
  code: string;
  message: string;
}

export interface CalendarStats {
  totalTeachingWeeks: number;
  effectiveTeachingWeeks: number;
  totalHolidays: number;
  totalExamPeriods: number;
  totalBreaks: number;
  totalEvents: number;
  busiestMonth: string;
  leastBusyMonth: string;
}

export interface CalendarInsightsResult {
  stats: CalendarStats;
  insights: CalendarInsight[];
  impactScore?: number;
}

// ─── Helpers ─────────────────────────────────────────────

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// ─── Service ─────────────────────────────────────────────

export class CalendarInsightsService {
  constructor(private readonly impactService: CalendarImpactService) {}

  generateInsights(calendar: SchoolCalendar): CalendarInsightsResult {
    const insights: CalendarInsight[] = [];
    const events = calendar.events;

    // ── Stats ──
    const totalTeachingWeeks = calendar.terms.reduce((sum, t) => sum + t.teachingWeeks, 0);

    let effectiveTeachingWeeks = 0;
    for (const term of calendar.terms) {
      const termImpact = this.impactService.analyzeTermImpact(term, events);
      effectiveTeachingWeeks += termImpact.effectiveWeeks;
    }
    effectiveTeachingWeeks = Math.round(effectiveTeachingWeeks * 10) / 10;

    const totalHolidays = events.filter(
      e => e.type === CalendarEventType.NATIONAL_HOLIDAY || e.type === CalendarEventType.SCHOOL_HOLIDAY,
    ).length;

    const totalExamPeriods = events.filter(
      e => e.type === CalendarEventType.EXAM_PERIOD || e.type === CalendarEventType.MAKEUP_EXAM,
    ).length;

    const totalBreaks = events.filter(
      e => e.type === CalendarEventType.TRIMESTER_BREAK,
    ).length;

    // Events per month
    const monthCounts: Record<number, number> = {};
    for (const event of events) {
      const m = new Date(event.startDate).getUTCMonth();
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }

    const months = Object.entries(monthCounts).sort(([, a], [, b]) => b - a);
    const busiestMonth = months.length > 0 ? MONTHS_PT[parseInt(months[0][0])] : '-';
    const leastBusyMonth = months.length > 0 ? MONTHS_PT[parseInt(months[months.length - 1][0])] : '-';

    const stats: CalendarStats = {
      totalTeachingWeeks,
      effectiveTeachingWeeks,
      totalHolidays,
      totalExamPeriods,
      totalBreaks,
      totalEvents: events.length,
      busiestMonth,
      leastBusyMonth,
    };

    // ── Insights ──

    // Low total teaching weeks
    if (totalTeachingWeeks < 30) {
      insights.push({
        severity: 'warning',
        code: 'LOW_TOTAL_WEEKS',
        message: `O ano lectivo tem apenas ${totalTeachingWeeks} semanas lectivas (recomendado: 30+).`,
      });
    }

    // Effective weeks significantly lower than nominal
    if (effectiveTeachingWeeks < totalTeachingWeeks * 0.85) {
      insights.push({
        severity: 'warning',
        code: 'HIGH_EVENT_IMPACT',
        message: `Eventos reduzem as semanas lectivas de ${totalTeachingWeeks} para ${effectiveTeachingWeeks} efectivas.`,
      });
    }

    // Per-term analysis
    for (const term of calendar.terms) {
      const termImpact = this.impactService.analyzeTermImpact(term, events);

      // Short term
      if (termImpact.effectiveWeeks < 8) {
        insights.push({
          severity: 'warning',
          code: 'SHORT_TERM',
          message: `${term.name} tem apenas ${termImpact.effectiveWeeks} semanas lectivas efectivas (mínimo recomendado: 8).`,
        });
      }

      // No events in term
      const termEvents = events.filter(e => {
        const eStart = new Date(e.startDate);
        return eStart >= term.startDate && eStart <= term.endDate;
      });
      if (termEvents.length === 0) {
        insights.push({
          severity: 'info',
          code: 'TERM_NO_EVENTS',
          message: `${term.name} não tem eventos registados.`,
        });
      }
    }

    // Holidays falling on weekends
    const weekendHolidays = events.filter(
      e =>
        (e.type === CalendarEventType.NATIONAL_HOLIDAY || e.type === CalendarEventType.SCHOOL_HOLIDAY) &&
        isWeekend(new Date(e.startDate)),
    );
    if (weekendHolidays.length > 0) {
      const names = weekendHolidays.map(e => e.title).join(', ');
      insights.push({
        severity: 'info',
        code: 'HOLIDAY_ON_WEEKEND',
        message: `Feriado(s) em fim-de-semana (sem impacto lectivo): ${names}.`,
      });
    }

    // Exam period overlapping holiday
    const examPeriods = events.filter(e => e.type === CalendarEventType.EXAM_PERIOD);
    for (const exam of examPeriods) {
      const overlapping = events.filter(e => {
        if (e.type !== CalendarEventType.NATIONAL_HOLIDAY && e.type !== CalendarEventType.SCHOOL_HOLIDAY) return false;
        return new Date(e.startDate) <= new Date(exam.endDate) && new Date(e.endDate) >= new Date(exam.startDate);
      });
      if (overlapping.length > 0) {
        insights.push({
          severity: 'warning',
          code: 'EXAM_HOLIDAY_OVERLAP',
          message: `${exam.title} sobrepõe-se com feriado: ${overlapping.map(o => o.title).join(', ')}.`,
        });
      }
    }

    // Compute overall impact score
    const impactScore = this.impactService.computeCalendarImpactScore(calendar);

    return { stats, insights, impactScore: impactScore.score };
  }
}
