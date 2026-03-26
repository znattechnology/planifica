import { IPlanVersionRepository } from '@/src/domain/interfaces/repositories/plan-version.repository';
import { PlanVersion } from '@/src/domain/entities/plan-version.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

export class PrismaPlanVersionRepository implements IPlanVersionRepository {
  async findByPlanId(planId: string): Promise<PlanVersion[]> {
    const versions = await prisma.planVersion.findMany({
      where: { planId },
      orderBy: { version: 'desc' },
    });
    return versions as unknown as PlanVersion[];
  }

  async findLatest(planId: string): Promise<PlanVersion | null> {
    const version = await prisma.planVersion.findFirst({
      where: { planId },
      orderBy: { version: 'desc' },
    });
    return version as unknown as PlanVersion | null;
  }

  async findByVersion(planId: string, version: number): Promise<PlanVersion | null> {
    const result = await prisma.planVersion.findUnique({
      where: { planId_version: { planId, version } },
    });
    return result as unknown as PlanVersion | null;
  }

  async create(data: Omit<PlanVersion, 'id' | 'createdAt'>): Promise<PlanVersion> {
    const version = await prisma.planVersion.create({ data: data as never });
    return version as unknown as PlanVersion;
  }
}
