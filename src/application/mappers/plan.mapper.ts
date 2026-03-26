import { Plan } from '@/src/domain/entities/plan.entity';
import { PlanResponseDTO } from '@/src/application/dtos/plan';

export class PlanMapper {
  static toDTO(plan: Plan): PlanResponseDTO {
    return {
      id: plan.id,
      type: plan.type,
      title: plan.title,
      subject: plan.subject,
      grade: plan.grade,
      academicYear: plan.academicYear,
      content: plan.content,
      status: plan.status,
      parentPlanId: plan.parentPlanId,
      dosificacaoId: plan.dosificacaoId,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  static toDTOList(plans: Plan[]): PlanResponseDTO[] {
    return plans.map(PlanMapper.toDTO);
  }
}
