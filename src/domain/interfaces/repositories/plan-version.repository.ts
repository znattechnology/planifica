import { PlanVersion } from '@/src/domain/entities/plan-version.entity';

export interface IPlanVersionRepository {
  findByPlanId(planId: string): Promise<PlanVersion[]>;
  findLatest(planId: string): Promise<PlanVersion | null>;
  findByVersion(planId: string, version: number): Promise<PlanVersion | null>;
  create(data: Omit<PlanVersion, 'id' | 'createdAt'>): Promise<PlanVersion>;
}
