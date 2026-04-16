import { GeneratePlanUseCase } from '@/src/domain/use-cases/plan/generate-plan.use-case';
import { GetPlansUseCase } from '@/src/domain/use-cases/plan/get-plans.use-case';
import { UpdatePlanUseCase } from '@/src/domain/use-cases/plan/update-plan.use-case';
import { CreatePlanDTO, PlanResponseDTO } from '@/src/application/dtos/plan';
import { PlanMapper } from '@/src/application/mappers/plan.mapper';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { PaginationParams } from '@/src/domain/interfaces/repositories/plan.repository';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export class PlanService {
  constructor(
    private readonly generatePlanUseCase: GeneratePlanUseCase,
    private readonly getPlansUseCase: GetPlansUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
    private readonly schoolCalendarRepository?: ISchoolCalendarRepository,
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
      lessonsPerWeek: dto.lessonsPerWeek,
    });
    return PlanMapper.toDTO(plan);
  }

  async getPlans(userId: string, type?: PlanType, pagination?: PaginationParams): Promise<PaginatedResponse<PlanResponseDTO>> {
    const result = await this.getPlansUseCase.execute(userId, type, pagination);

    // Resolve current calendar versions for outdated detection
    const calendarVersionMap = await this.resolveCalendarVersions(result.data);
    const options = calendarVersionMap.size > 0 ? { calendarVersionMap } : undefined;

    return {
      data: PlanMapper.toDTOList(result.data, options),
      pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    };
  }

  /**
   * Batch-resolve current calendar versions for a set of plans.
   */
  private async resolveCalendarVersions(plans: import('@/src/domain/entities/plan.entity').Plan[]): Promise<Map<string, number>> {
    const versionMap = new Map<string, number>();
    if (!this.schoolCalendarRepository) return versionMap;

    const calendarIds = new Set(plans.map(p => p.calendarId).filter((id): id is string => !!id));
    for (const calendarId of calendarIds) {
      try {
        const calendar = await this.schoolCalendarRepository.findById(calendarId);
        if (calendar) {
          versionMap.set(calendarId, calendar.version);
        }
      } catch {
        // Non-critical — skip
      }
    }
    return versionMap;
  }
}
