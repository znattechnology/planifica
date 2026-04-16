import { NextRequest } from 'next/server';
import { AuthService } from '@/src/auth/auth.service';
import { ListSubscriptionPlanConfigsUseCase } from '@/src/domain/use-cases/subscription/list-subscription-plan-configs.use-case';
import { CreateSubscriptionPlanConfigUseCase } from '@/src/domain/use-cases/subscription/create-subscription-plan-config.use-case';
import { UpdateSubscriptionPlanConfigUseCase } from '@/src/domain/use-cases/subscription/update-subscription-plan-config.use-case';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { UserRole } from '@/src/domain/entities/user.entity';
import { ForbiddenError } from '@/src/domain/errors/domain.error';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';

export class SubscriptionPlanConfigController {
  constructor(
    private readonly authService: AuthService,
    private readonly listUseCase: ListSubscriptionPlanConfigsUseCase,
    private readonly createUseCase: CreateSubscriptionPlanConfigUseCase,
    private readonly updateUseCase: UpdateSubscriptionPlanConfigUseCase,
    private readonly logger: ILogger,
  ) {}

  async listPlanConfigs(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) throw new ForbiddenError('Apenas administradores podem gerir planos');
      const configs = await this.listUseCase.execute();
      return successResponse(configs);
    } catch (error) {
      this.logger.error('Failed to list plan configs', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async createPlanConfig(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) throw new ForbiddenError('Apenas administradores podem gerir planos');
      const body = await request.json() as {
        slug?: string;
        name?: string;
        priceKz?: number;
        durationDays?: number;
        plansPerMonth?: number;
        paymentExpiryHours?: number;
        isActive?: boolean;
      };
      const config = await this.createUseCase.execute({
        slug: body.slug ?? '',
        name: body.name ?? '',
        priceKz: body.priceKz ?? 0,
        durationDays: body.durationDays ?? 30,
        plansPerMonth: body.plansPerMonth ?? -1,
        paymentExpiryHours: body.paymentExpiryHours ?? 24,
        isActive: body.isActive,
      });
      this.logger.info('Plan config created', { event: 'plan_config.created', requestId, slug: config.slug, adminId: user.id });
      return successResponse(config, 201);
    } catch (error) {
      this.logger.error('Failed to create plan config', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async updatePlanConfig(request: NextRequest, id: string) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) throw new ForbiddenError('Apenas administradores podem gerir planos');
      const body = await request.json() as {
        name?: string;
        priceKz?: number;
        durationDays?: number;
        plansPerMonth?: number;
        paymentExpiryHours?: number;
        isActive?: boolean;
      };
      const config = await this.updateUseCase.execute(id, body);
      this.logger.info('Plan config updated', { event: 'plan_config.updated', requestId, id, adminId: user.id });
      return successResponse(config);
    } catch (error) {
      this.logger.error('Failed to update plan config', error as Error, { requestId });
      return handleApiError(error);
    }
  }
}
