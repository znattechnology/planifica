import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { AIExplanationService } from '@/src/ai/services/ai-explanation.service';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';
import { resolveCalendarContextWithMetadata } from '@/src/shared/utils/calendar-context';

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

    // Get calendar context with metadata
    const { calendarContext, calendarInfo, fallbackUsed } = await resolveCalendarContextWithMetadata(
      user.id, plan.academicYear,
      container.calendarResolutionService,
    );

    // Check if plan is outdated relative to current calendar
    let isOutdated = false;
    if (calendarInfo && plan.calendarId && plan.calendarVersion) {
      isOutdated = plan.calendarVersion !== calendarInfo.version && plan.calendarId === calendarInfo.id;
    }

    const explanationService = new AIExplanationService();
    const result = explanationService.explain(
      plan,
      parentPlan || undefined,
      teachingHistory || undefined,
      calendarContext,
      plan.qualityScores,
    );

    return NextResponse.json({
      success: true,
      data: result,
      calendar: calendarInfo ? { ...calendarInfo, fallbackUsed } : undefined,
      isOutdated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
