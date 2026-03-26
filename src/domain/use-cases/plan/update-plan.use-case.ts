import { Plan, PlanContent, PlanStatus } from '@/src/domain/entities/plan.entity';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import { buildCacheKey } from '@/src/cache/cache.service';

export interface UpdatePlanInput {
  planId: string;
  userId: string;
  title?: string;
  content?: Partial<PlanContent>;
  status?: PlanStatus;
}

export class UpdatePlanUseCase {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly cache?: ICacheService,
  ) {}

  async execute(input: UpdatePlanInput): Promise<Plan> {
    const plan = await this.planRepository.findById(input.planId);
    if (!plan) {
      throw new EntityNotFoundError('Plan', input.planId);
    }

    const updated = await this.planRepository.update(input.planId, {
      ...(input.title && { title: input.title }),
      ...(input.content && { content: { ...plan.content, ...input.content } }),
      ...(input.status && { status: input.status }),
    });

    // Invalidate cached AI-generated content when plan content is modified
    if (input.content && this.cache) {
      const cacheKey = buildCacheKey(
        'plan',
        plan.type,
        plan.dosificacaoId,
        plan.subject,
        plan.grade,
      );
      // Delete all possible cache variants (with/without trimester/week)
      await this.cache.delete(cacheKey);
    }

    return updated;
  }
}
