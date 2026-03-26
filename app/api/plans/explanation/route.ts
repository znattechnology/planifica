import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { AIExplanationService } from '@/src/ai/services/ai-explanation.service';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

/**
 * GET /api/plans/explanation?planId=xxx
 *
 * Returns AI-generated explanation of how and why the plan was created.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'planId é obrigatório' } },
        { status: 422 },
      );
    }

    const plan = await container.planRepository.findById(planId);
    if (!plan || plan.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Plano não encontrado' } },
        { status: 404 },
      );
    }

    // Get parent plan
    let parentPlan;
    if (plan.parentPlanId) {
      parentPlan = await container.planRepository.findById(plan.parentPlanId);
    }

    // Get teaching history
    let teachingHistory;
    try {
      const historyService = new TeachingHistoryService(
        container.lessonRepository,
        container.teachingActivityRepository,
      );
      teachingHistory = await historyService.buildContext(user.id, plan.subject);
    } catch { /* proceed without */ }

    // Get calendar context
    let calendarContext: CalendarContext | undefined;
    try {
      const calendar = await container.schoolCalendarRepository.findByUserAndYear(
        user.id, plan.academicYear,
      );
      if (calendar) {
        calendarContext = {
          terms: calendar.terms.map(t => ({
            trimester: t.trimester,
            startDate: t.startDate.toISOString().split('T')[0],
            endDate: t.endDate.toISOString().split('T')[0],
            teachingWeeks: t.teachingWeeks,
          })),
          events: calendar.events.map(e => ({
            title: e.title,
            startDate: e.startDate.toISOString().split('T')[0],
            endDate: e.endDate.toISOString().split('T')[0],
            type: e.type,
          })),
        };
      }
    } catch { /* proceed without */ }

    const explanationService = new AIExplanationService();
    const result = explanationService.explain(
      plan,
      parentPlan || undefined,
      teachingHistory || undefined,
      calendarContext,
      plan.qualityScores,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
