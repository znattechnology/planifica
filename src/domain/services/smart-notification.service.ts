import type { Plan } from '@/src/domain/entities/plan.entity';
import type { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';
import { CalendarResolutionService } from './calendar-resolution.service';
import { CalendarInsightsService } from './calendar-insights.service';

// ─── Types ───────────────────────────────────────────────

export interface SmartNotification {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  affectedPlanIds?: string[];
  actionSuggestion?: string;
}

// ─── Severity ordering ──────────────────────────────────

const SEVERITY_ORDER: Record<SmartNotification['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ─── Insight codes handled explicitly ───────────────────

const HANDLED_INSIGHT_CODES = new Set([
  'EXAM_HOLIDAY_OVERLAP',
  'HIGH_EVENT_IMPACT',
  'SHORT_TERM',
]);

// ─── Service ────────────────────────────────────────────

export class SmartNotificationService {
  constructor(
    private readonly insightsService: CalendarInsightsService,
    private readonly resolutionService: CalendarResolutionService,
  ) {}

  generateNotifications(
    calendar: SchoolCalendar,
    plans: Plan[],
  ): SmartNotification[] {
    const notifications: SmartNotification[] = [];

    // 1. Get calendar insights
    const { insights } = this.insightsService.generateInsights(calendar);

    // 2. Check for outdated plans
    const outdatedPlanIds = plans
      .filter(plan => plan.calendarId === calendar.id && this.resolutionService.isPlanOutdated(plan, calendar))
      .map(plan => plan.id);

    // 3a. PLANS_OUTDATED (critical)
    if (outdatedPlanIds.length > 0) {
      notifications.push({
        code: 'PLANS_OUTDATED',
        severity: 'critical',
        title: 'Planos desatualizados',
        message: `${outdatedPlanIds.length} plano(s) foram gerados com uma versão anterior do calendário.`,
        affectedPlanIds: outdatedPlanIds,
        actionSuggestion: 'Considere regenerar estes planos para reflectir as alterações ao calendário.',
      });
    }

    // 3b. EXAM_HOLIDAY_OVERLAP (warning)
    const examOverlapInsight = insights.find(i => i.code === 'EXAM_HOLIDAY_OVERLAP');
    if (examOverlapInsight) {
      notifications.push({
        code: 'EXAM_HOLIDAY_OVERLAP',
        severity: 'warning',
        title: 'Sobreposição provas/feriado',
        message: examOverlapInsight.message,
        actionSuggestion: 'Ajuste as datas de avaliação para evitar conflitos.',
      });
    }

    // 3c. HIGH_EVENT_IMPACT (warning)
    const highImpactInsight = insights.find(i => i.code === 'HIGH_EVENT_IMPACT');
    if (highImpactInsight) {
      notifications.push({
        code: 'HIGH_EVENT_IMPACT',
        severity: 'warning',
        title: 'Impacto elevado de eventos',
        message: highImpactInsight.message,
        actionSuggestion: 'Revise a distribuição de conteúdos para compensar a perda de semanas.',
      });
    }

    // 3d. SHORT_TERM (warning) — one notification per insight
    const shortTermInsights = insights.filter(i => i.code === 'SHORT_TERM');
    for (const insight of shortTermInsights) {
      notifications.push({
        code: 'SHORT_TERM',
        severity: 'warning',
        title: 'Trimestre curto',
        message: insight.message,
        actionSuggestion: 'Priorize os conteúdos essenciais neste trimestre.',
      });
    }

    // 3e. OVERLOADED_WEEK (warning) — check plans with weeklyPlan
    for (const plan of plans) {
      const weeklyPlan = plan.content?.weeklyPlan;
      if (!weeklyPlan) continue;

      const hasOverloadedWeek = weeklyPlan.some(week => week.numLessons > 4);
      if (hasOverloadedWeek) {
        notifications.push({
          code: 'OVERLOADED_WEEK',
          severity: 'warning',
          title: 'Semana sobrecarregada',
          message: `Plano "${plan.title}" tem semanas com mais de 4 aulas.`,
          affectedPlanIds: [plan.id],
          actionSuggestion: 'Redistribua a carga lectiva.',
        });
      }
    }

    // 3f. Map remaining info-severity insights not already handled
    const remainingInsights = insights.filter(
      i => i.severity === 'info' && !HANDLED_INSIGHT_CODES.has(i.code),
    );
    for (const insight of remainingInsights) {
      notifications.push({
        code: insight.code,
        severity: 'info',
        title: insight.code,
        message: insight.message,
      });
    }

    // 4. Sort by severity: critical → warning → info
    notifications.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    return notifications;
  }
}
