import { PlanType, PlanStatus, PlanContent } from '@/src/domain/entities/plan.entity';

export interface PlanResponseDTO {
  id: string;
  type: PlanType;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  content: PlanContent;
  status: PlanStatus;
  parentPlanId?: string;
  dosificacaoId: string;
  createdAt: string;
  updatedAt: string;
}
