import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { PlanQualityService } from '@/src/ai/services/plan-quality.service';
import { resolveCalendarContextWithMetadata } from '@/src/shared/utils/calendar-context';

/**
 * GET /api/plans/insights?planId=xxx
 *
 * Returns quality scores and human-readable insights for a plan.
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

    // Resolve calendar with metadata
    const { calendarContext, calendarInfo, fallbackUsed } = await resolveCalendarContextWithMetadata(
      user.id, plan.academicYear,
      container.calendarResolutionService,
    );

    // Check if plan is outdated
    let isOutdated = false;
    if (calendarInfo && plan.calendarId && plan.calendarVersion) {
      isOutdated = plan.calendarVersion !== calendarInfo.version && plan.calendarId === calendarInfo.id;
    }

    const qualityService = new PlanQualityService();
    const siblingPlans = await container.planRepository.findByDosificacaoId(plan.dosificacaoId);
    const siblings = siblingPlans.filter(p => p.id !== plan.id && p.type === plan.type);
    const parentPlan = plan.parentPlanId
      ? await container.planRepository.findById(plan.parentPlanId)
      : undefined;

    const report = qualityService.evaluate(
      plan, siblings, parentPlan || undefined, calendarContext,
    );

    // Persist scores for caching (non-critical)
    if (!plan.qualityScores || hasScoresChanged(plan.qualityScores, report.scores)) {
      try {
        await container.planRepository.update(plan.id, {
          qualityScores: report.scores,
        } as never);
      } catch { /* non-critical */ }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report.scores,
        insights: report.insights,
      },
      calendar: calendarInfo ? { ...calendarInfo, fallbackUsed } : undefined,
      isOutdated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function hasScoresChanged(
  existing: { overallScore: number; evaluatedAt: string },
  updated: { overallScore: number },
): boolean {
  const ageMs = Date.now() - new Date(existing.evaluatedAt).getTime();
  return ageMs >= 3600_000 || existing.overallScore !== updated.overallScore;
}
