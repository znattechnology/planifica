import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { PlanStatus } from '@/src/domain/entities/plan.entity';

/**
 * POST /api/plans/retry
 *
 * Re-triggers plan generation for a plan stuck in DRAFT (failed generation).
 * Enforces the same subscription limit as the normal generate endpoint.
 * The failed DRAFT plan is deleted before creating the new one so the user
 * does not accumulate ghost records.
 *
 * Body: { planId: string }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const token = getAccessToken(request);
  const key = `generate-plan:${token || ip}`;
  const result = checkRateLimit(key, RATE_LIMITS.GENERATE_PLAN);
  if (!result.allowed) {
    return rateLimitResponse(result);
  }

  try {
    const user = await container.authService.getUserFromRequest(request);
    const body = await request.json();
    const { planId } = body;

    if (!planId || typeof planId !== 'string') {
      return handleApiError(new Error('planId é obrigatório'));
    }

    const logger = container.getLogger('plan-retry');

    // Fetch and validate the existing plan
    const existingPlan = await container.planRepository.findById(planId);
    if (!existingPlan || existingPlan.userId !== user.id) {
      return handleApiError(new Error('Plano não encontrado'));
    }

    if (existingPlan.status !== PlanStatus.DRAFT) {
      return handleApiError(new Error('Apenas planos em estado DRAFT podem ser regenerados'));
    }

    // Enforce subscription limits before consuming AI tokens — same as normal generate
    await container.subscriptionAccessMiddleware.check(user.id, 'generate_plan');

    logger.info('Retrying plan generation', {
      planId,
      userId: user.id,
      type: existingPlan.type,
      title: existingPlan.title,
    });

    // Delete the failed DRAFT first so it does not count as a "used" plan slot
    // and does not accumulate as a ghost record
    await container.planRepository.delete(planId);

    // Re-generate using the original plan's configuration
    const newPlan = await container.planService.generatePlan(user.id, {
      dosificacaoId: existingPlan.dosificacaoId,
      type: existingPlan.type,
      title: existingPlan.title,
      trimester: existingPlan.trimester,
      week: existingPlan.weekIndex,
      parentPlanId: existingPlan.parentPlanId,
      additionalContext: 'Tentativa de regeneração após falha anterior.',
    });

    return successResponse(newPlan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
