import { IPlanRepository, PaginationParams, PaginatedResult } from '@/src/domain/interfaces/repositories/plan.repository';
import { Plan, PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

const DEFAULT_LIMIT = 20;

function normalizePagination(params?: PaginationParams) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

function buildPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export class PrismaPlanRepository implements IPlanRepository {
  async findById(id: string): Promise<Plan | null> {
    const plan = await prisma.plan.findUnique({ where: { id } });
    return plan as unknown as Plan | null;
  }

  async findByUserId(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Plan>> {
    const { page, limit, skip } = normalizePagination(pagination);
    const where = { userId };
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.plan.count({ where }),
    ]);
    return buildPaginatedResult(plans as unknown as Plan[], total, page, limit);
  }

  async findByType(userId: string, type: PlanType, pagination?: PaginationParams): Promise<PaginatedResult<Plan>> {
    const { page, limit, skip } = normalizePagination(pagination);
    const where = { userId, type };
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.plan.count({ where }),
    ]);
    return buildPaginatedResult(plans as unknown as Plan[], total, page, limit);
  }

  async findByDosificacaoId(dosificacaoId: string): Promise<Plan[]> {
    const plans = await prisma.plan.findMany({
      where: { dosificacaoId },
      orderBy: { createdAt: 'desc' },
    });
    return plans as unknown as Plan[];
  }

  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    const plan = await prisma.plan.create({ data: data as never });
    return plan as unknown as Plan;
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan> {
    const plan = await prisma.plan.update({
      where: { id },
      data: data as never,
    });
    return plan as unknown as Plan;
  }

  async updateStatus(id: string, status: PlanStatus): Promise<Plan> {
    const plan = await prisma.plan.update({
      where: { id },
      data: { status },
    });
    return plan as unknown as Plan;
  }

  async delete(id: string): Promise<void> {
    await prisma.plan.delete({ where: { id } });
  }

  async findAll(pagination?: PaginationParams): Promise<PaginatedResult<Plan>> {
    const { page, limit, skip } = normalizePagination(pagination);
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.plan.count(),
    ]);
    return buildPaginatedResult(plans as unknown as Plan[], total, page, limit);
  }
}
