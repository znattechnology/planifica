import { PlanType } from '@/src/domain/entities/plan.entity';

export interface CreatePlanDTO {
  dosificacaoId?: string;
  type: PlanType;
  title: string;
  trimester?: number;
  week?: number;
  parentPlanId?: string;
  additionalContext?: string;
  lessonsPerWeek?: number;
}
