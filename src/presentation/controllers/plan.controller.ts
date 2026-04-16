import { NextRequest } from 'next/server';
import { PlanService } from '@/src/application/services/plan.service';
import { AuthService } from '@/src/auth/auth.service';
import { validateCreatePlan } from '@/src/application/validators/plan.validator';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { SubscriptionAccessMiddleware } from '@/src/presentation/middleware/subscription-access.middleware';

export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly authService: AuthService,
    private readonly logger: ILogger,
    private readonly subscriptionAccessMiddleware: SubscriptionAccessMiddleware,
  ) {}

  async getPlans(request: NextRequest) {
    try {
      const user = await this.authService.getUserFromRequest(request);
      const type = request.nextUrl.searchParams.get('type') as PlanType | null;
      const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
      const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

      this.logger.info('Fetching plans', { userId: user.id, type: type || 'all', page, limit });

      const result = await this.planService.getPlans(user.id, type || undefined, { page, limit });
      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to fetch plans', error as Error);
      return handleApiError(error);
    }
  }

  async generatePlan(request: NextRequest) {
    const startedAt = Date.now();
    try {
      const user = await this.authService.getUserFromRequest(request);

      // Enforce subscription limits before consuming AI tokens
      await this.subscriptionAccessMiddleware.check(user.id, 'generate_plan');

      const body = await request.json();
      const dto = validateCreatePlan(body);

      this.logger.info('Plan generation started', {
        event: 'plan.generation.start',
        userId: user.id,
        type: dto.type,
        title: dto.title,
      });

      const plan = await this.planService.generatePlan(user.id, dto);

      this.logger.info('Plan generation completed', {
        event: 'plan.generation.end',
        userId: user.id,
        planId: plan.id,
        type: plan.type,
        durationMs: Date.now() - startedAt,
      });

      return successResponse(plan, 201);
    } catch (error) {
      this.logger.error('Plan generation failed', error as Error, {
        event: 'plan.generation.error',
        durationMs: Date.now() - startedAt,
      });
      return handleApiError(error);
    }
  }
}
