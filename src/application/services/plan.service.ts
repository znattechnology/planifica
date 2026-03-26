import { GeneratePlanUseCase } from '@/src/domain/use-cases/plan/generate-plan.use-case';
import { GetPlansUseCase } from '@/src/domain/use-cases/plan/get-plans.use-case';
import { UpdatePlanUseCase } from '@/src/domain/use-cases/plan/update-plan.use-case';
import { CreatePlanDTO, PlanResponseDTO } from '@/src/application/dtos/plan';
import { PlanMapper } from '@/src/application/mappers/plan.mapper';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { PaginationParams } from '@/src/domain/interfaces/repositories/plan.repository';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export class PlanService {
  constructor(
    private readonly generatePlanUseCase: GeneratePlanUseCase,
    private readonly getPlansUseCase: GetPlansUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
  ) {}

  async generatePlan(userId: string, dto: CreatePlanDTO): Promise<PlanResponseDTO> {
    const plan = await this.generatePlanUseCase.execute({
      userId,
      dosificacaoId: dto.dosificacaoId,
      type: dto.type,
      title: dto.title,
      trimester: dto.trimester,
      week: dto.week,
      parentPlanId: dto.parentPlanId,
      additionalContext: dto.additionalContext,
    });
    return PlanMapper.toDTO(plan);
  }

  async getPlans(userId: string, type?: PlanType, pagination?: PaginationParams): Promise<PaginatedResponse<PlanResponseDTO>> {
    const result = await this.getPlansUseCase.execute(userId, type, pagination);
    return {
      data: PlanMapper.toDTOList(result.data),
      pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    };
  }
}
