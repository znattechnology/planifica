import { CreatePlanDTO } from '@/src/application/dtos/plan';
import { PlanType } from '@/src/domain/entities/plan.entity';

export function validateCreatePlan(data: unknown): CreatePlanDTO {
  const dto = data as CreatePlanDTO;

  if (!dto.dosificacaoId && !dto.parentPlanId) {
    throw new Error('dosificacaoId or parentPlanId is required');
  }

  if (!dto.type || !Object.values(PlanType).includes(dto.type)) {
    throw new Error(`type must be one of: ${Object.values(PlanType).join(', ')}`);
  }

  if (!dto.title || typeof dto.title !== 'string' || dto.title.trim().length === 0) {
    throw new Error('title is required');
  }

  if (dto.trimester !== undefined && (dto.trimester < 1 || dto.trimester > 3)) {
    throw new Error('trimester must be between 1 and 3');
  }

  return {
    dosificacaoId: dto.dosificacaoId,
    type: dto.type,
    title: dto.title.trim(),
    trimester: dto.trimester,
    week: dto.week,
    parentPlanId: dto.parentPlanId,
    additionalContext: dto.additionalContext,
  };
}
