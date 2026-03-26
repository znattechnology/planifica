import { Plan, PlanType } from '@/src/domain/entities/plan.entity';
import { IPlanRepository, PaginationParams, PaginatedResult } from '@/src/domain/interfaces/repositories/plan.repository';

export class GetPlansUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async execute(userId: string, type?: PlanType, pagination?: PaginationParams): Promise<PaginatedResult<Plan>> {
    if (type) {
      return this.planRepository.findByType(userId, type, pagination);
    }
    return this.planRepository.findByUserId(userId, pagination);
  }
}
