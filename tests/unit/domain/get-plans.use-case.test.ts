import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPlansUseCase } from '@/src/domain/use-cases/plan/get-plans.use-case';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import type { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';

const mockPlans = [
  {
    id: 'plan-1',
    userId: 'user-1',
    type: PlanType.ANNUAL,
    title: 'Plano Anual',
    subject: 'Matemática',
    grade: '10ª',
    academicYear: '2025/2026',
    content: { generalObjectives: [], specificObjectives: [], competencies: [], topics: [] },
    status: PlanStatus.GENERATED,
    dosificacaoId: 'dos-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'plan-2',
    userId: 'user-1',
    type: PlanType.TRIMESTER,
    title: 'Plano Trimestral',
    subject: 'Matemática',
    grade: '10ª',
    academicYear: '2025/2026',
    content: { generalObjectives: [], specificObjectives: [], competencies: [], topics: [] },
    status: PlanStatus.DRAFT,
    dosificacaoId: 'dos-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const paginatedResult = (data: typeof mockPlans) => ({
  data,
  total: data.length,
  page: 1,
  limit: 20,
  totalPages: 1,
});

describe('GetPlansUseCase', () => {
  let useCase: GetPlansUseCase;
  let planRepository: IPlanRepository;

  beforeEach(() => {
    planRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue(paginatedResult(mockPlans)),
      findByType: vi.fn().mockResolvedValue(paginatedResult([mockPlans[0]])),
      findByDosificacaoId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };
    useCase = new GetPlansUseCase(planRepository);
  });

  it('should return all plans for user when no type filter', async () => {
    const result = await useCase.execute('user-1');

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(planRepository.findByUserId).toHaveBeenCalledWith('user-1', undefined);
  });

  it('should return filtered plans when type is provided', async () => {
    const result = await useCase.execute('user-1', PlanType.ANNUAL);

    expect(result.data).toHaveLength(1);
    expect(planRepository.findByType).toHaveBeenCalledWith('user-1', PlanType.ANNUAL, undefined);
  });

  it('should not call findByType when type is undefined', async () => {
    await useCase.execute('user-1');

    expect(planRepository.findByType).not.toHaveBeenCalled();
    expect(planRepository.findByUserId).toHaveBeenCalled();
  });

  it('should pass pagination params through', async () => {
    await useCase.execute('user-1', undefined, { page: 2, limit: 10 });

    expect(planRepository.findByUserId).toHaveBeenCalledWith('user-1', { page: 2, limit: 10 });
  });
});
