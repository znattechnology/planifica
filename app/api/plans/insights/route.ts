import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { PlanQualityService } from '@/src/ai/services/plan-quality.service';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

/**
 * GET /api/plans/insights?planId=xxx
 *
 * Returns quality scores and human-readable insights for a plan.
 *
 * Response:
 * {
 *   coherenceScore: number,
 *   workloadBalanceScore: number,
 *   calendarAlignmentScore: number,
 *   overallScore: number,
 *   insights: { type: "success"|"warning"|"error", message: string }[]
 * }
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

    // If we already have cached quality scores and they're recent (< 1 hour), return them
    if (plan.qualityScores) {
      const evaluatedAt = new Date(plan.qualityScores.evaluatedAt);
      const ageMs = Date.now() - evaluatedAt.getTime();
      if (ageMs < 3600_000) {
        // Re-evaluate to get insights (scores are cached but insights aren't in DB)
        const qualityService = new PlanQualityService();
        const siblingPlans = await container.planRepository.findByDosificacaoId(plan.dosificacaoId);
        const siblings = siblingPlans.filter(p => p.id !== plan.id && p.type === plan.type);
        const parentPlan = plan.parentPlanId
          ? await container.planRepository.findById(plan.parentPlanId)
          : undefined;

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

        const report = qualityService.evaluate(
          plan, siblings, parentPlan || undefined, calendarContext,
        );

        return NextResponse.json({
          success: true,
          data: {
            ...report.scores,
            insights: report.insights,
          },
        });
      }
    }

    // Full evaluation
    const qualityService = new PlanQualityService();
    const siblingPlans = await container.planRepository.findByDosificacaoId(plan.dosificacaoId);
    const siblings = siblingPlans.filter(p => p.id !== plan.id && p.type === plan.type);
    const parentPlan = plan.parentPlanId
      ? await container.planRepository.findById(plan.parentPlanId)
      : undefined;

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

    const report = qualityService.evaluate(
      plan, siblings, parentPlan || undefined, calendarContext,
    );

    // Persist scores for caching
    try {
      await container.planRepository.update(plan.id, {
        qualityScores: report.scores,
      } as never);
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      data: {
        ...report.scores,
        insights: report.insights,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
