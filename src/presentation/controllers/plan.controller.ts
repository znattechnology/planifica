import { NextRequest } from 'next/server';
import { PlanService } from '@/src/application/services/plan.service';
import { AuthService } from '@/src/auth/auth.service';
import { validateCreatePlan } from '@/src/application/validators/plan.validator';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly authService: AuthService,
    private readonly logger: ILogger,
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
    try {
      const user = await this.authService.getUserFromRequest(request);
      const body = await request.json();
      const dto = validateCreatePlan(body);

      this.logger.info('Generating plan', { userId: user.id, type: dto.type, title: dto.title });

      const plan = await this.planService.generatePlan(user.id, dto);
      return successResponse(plan, 201);
    } catch (error) {
      this.logger.error('Failed to generate plan', error as Error);
      return handleApiError(error);
    }
  }
}
