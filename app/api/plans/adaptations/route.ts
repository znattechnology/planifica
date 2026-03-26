import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { FeedbackImpactService } from '@/src/ai/services/feedback-impact.service';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';

/**
 * GET /api/plans/adaptations?planId=xxx
 *
 * Returns adaptation insights showing what the AI changed
 * based on teaching history feedback.
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

    // Get parent plan content if available
    let parentContent;
    if (plan.parentPlanId) {
      const parent = await container.planRepository.findById(plan.parentPlanId);
      parentContent = parent?.content;
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

    const impactService = new FeedbackImpactService();
    const report = impactService.analyze(
      plan.content,
      parentContent,
      teachingHistory || undefined,
    );

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return handleApiError(err);
  }
}
