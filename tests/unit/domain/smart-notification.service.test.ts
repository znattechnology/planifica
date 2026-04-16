import { describe, it, expect, vi } from 'vitest';
import { SmartNotificationService } from '@/src/domain/services/smart-notification.service';
import type { Plan, PlanContent } from '@/src/domain/entities/plan.entity';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import type { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';
import { CalendarType } from '@/src/domain/entities/school-calendar.entity';
import type { CalendarInsightsService, CalendarInsightsResult } from '@/src/domain/services/calendar-insights.service';
import type { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';

function makeCalendar(overrides?: Partial<SchoolCalendar>): SchoolCalendar {
  return {
    id: 'cal-1',
    userId: 'user-1',
    academicYear: '2025',
    country: 'AO',
    type: CalendarType.MINISTERIAL,
    isActive: true,
    version: 2,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    terms: [],
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SchoolCalendar;
}

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    id: 'plan-1',
    userId: 'user-1',
    type: PlanType.TRIMESTER,
    title: 'Plano Trimestral',
    subject: 'Matematica',
    grade: '10a',
    academicYear: '2025',
    trimester: 1,
    dosificacaoId: 'dos-1',
    calendarId: 'cal-1',
    calendarVersion: 2,
    status: PlanStatus.GENERATED,
    content: {
      generalObjectives: [],
      specificObjectives: [],
      competencies: [],
      topics: [],
      weeklyPlan: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
}

function createMockInsightsService(insights: CalendarInsightsResult['insights'] = []): CalendarInsightsService {
  return {
    generateInsights: vi.fn().mockReturnValue({
      stats: {
        totalTeachingWeeks: 36,
        effectiveTeachingWeeks: 34,
        totalHolidays: 0,
        totalExamPeriods: 0,
        totalBreaks: 0,
        totalEvents: 0,
        busiestMonth: '-',
        leastBusyMonth: '-',
      },
      insights,
      impactScore: 10,
    }),
  } as unknown as CalendarInsightsService;
}

function createMockResolutionService(outdatedResult: boolean): CalendarResolutionService {
  return {
    isPlanOutdated: vi.fn().mockReturnValue(outdatedResult),
  } as unknown as CalendarResolutionService;
}

describe('SmartNotificationService', () => {
  it('should return empty notifications when there are no issues', () => {
    const insightsService = createMockInsightsService([]);
    const resolutionService = createMockResolutionService(false);
    const service = new SmartNotificationService(insightsService, resolutionService);

    const calendar = makeCalendar();
    const plans: Plan[] = [];

    const notifications = service.generateNotifications(calendar, plans);

    expect(notifications).toHaveLength(0);
  });

  it('should generate PLANS_OUTDATED critical notification for outdated plans', () => {
    const insightsService = createMockInsightsService([]);
    const resolutionService = createMockResolutionService(true);
    const service = new SmartNotificationService(insightsService, resolutionService);

    const calendar = makeCalendar({ version: 2 });
    const plan = makePlan({ calendarId: 'cal-1', calendarVersion: 1 });

    const notifications = service.generateNotifications(calendar, [plan]);

    const outdated = notifications.find(n => n.code === 'PLANS_OUTDATED');
    expect(outdated).toBeDefined();
    expect(outdated!.severity).toBe('critical');
    expect(outdated!.affectedPlanIds).toContain('plan-1');
  });

  it('should generate OVERLOADED_WEEK warning when a week has more than 4 lessons', () => {
    const insightsService = createMockInsightsService([]);
    const resolutionService = createMockResolutionService(false);
    const service = new SmartNotificationService(insightsService, resolutionService);

    const calendar = makeCalendar();
    const plan = makePlan({
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [],
        weeklyPlan: [
          { week: '1a', unit: 'I', objectives: 'Obj', contents: 'Content', numLessons: 5 },
        ],
      },
    });

    const notifications = service.generateNotifications(calendar, [plan]);

    const overloaded = notifications.find(n => n.code === 'OVERLOADED_WEEK');
    expect(overloaded).toBeDefined();
    expect(overloaded!.severity).toBe('warning');
    expect(overloaded!.affectedPlanIds).toContain('plan-1');
  });

  it('should sort notifications by severity: critical before warning before info', () => {
    const insightsService = createMockInsightsService([
      { severity: 'info', code: 'TERM_NO_EVENTS', message: 'Info message' },
    ]);
    const resolutionService = createMockResolutionService(true);
    const service = new SmartNotificationService(insightsService, resolutionService);

    const calendar = makeCalendar({ version: 2 });
    const plan = makePlan({
      calendarId: 'cal-1',
      calendarVersion: 1,
      content: {
        generalObjectives: [],
        specificObjectives: [],
        competencies: [],
        topics: [],
        weeklyPlan: [
          { week: '1a', unit: 'I', objectives: 'Obj', contents: 'Content', numLessons: 5 },
        ],
      },
    });

    const notifications = service.generateNotifications(calendar, [plan]);

    expect(notifications.length).toBeGreaterThanOrEqual(2);

    // Verify ordering: critical first, then warning, then info
    for (let i = 1; i < notifications.length; i++) {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const prev = severityOrder[notifications[i - 1].severity];
      const curr = severityOrder[notifications[i].severity];
      expect(prev).toBeLessThanOrEqual(curr);
    }

    // Verify we have at least critical and warning
    expect(notifications[0].severity).toBe('critical');
  });
});
