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
  calendarId?: string;
  calendarVersion?: number;
  qualityScores?: import('@/src/domain/entities/plan.entity').PlanQualityScores;
  isCalendarOutdated?: boolean;
  calendarSource?: 'selected' | 'ministerial' | 'legacy' | 'none';
  calendarValidation?: { score: number; issues: string[] };
  createdAt: string;
  updatedAt: string;
}
