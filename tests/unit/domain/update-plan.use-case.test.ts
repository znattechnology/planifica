import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePlanUseCase } from '@/src/domain/use-cases/plan/update-plan.use-case';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import type { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import type { ICacheService } from '@/src/domain/interfaces/services/cache.service';

const basePlan = {
  id: 'plan-1',
  userId: 'user-1',
  type: PlanType.ANNUAL,
  title: 'Plano Original',
  subject: 'Matemática',
  grade: '10ª',
  academicYear: '2025/2026',
  content: {
    generalObjectives: ['Obj 1'],
    specificObjectives: [],
    competencies: [],
    topics: [],
    methodology: 'Expositivo',
  },
  status: PlanStatus.GENERATED,
  dosificacaoId: 'dos-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdatePlanUseCase', () => {
  let useCase: UpdatePlanUseCase;
  let planRepository: IPlanRepository;
  let cache: ICacheService;

  beforeEach(() => {
    planRepository = {
      findById: vi.fn().mockResolvedValue(basePlan),
      findByUserId: vi.fn(),
      findByType: vi.fn(),
      findByDosificacaoId: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...basePlan, ...data })),
      updateStatus: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };
    cache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    };
    useCase = new UpdatePlanUseCase(planRepository, cache);
  });

  it('should throw EntityNotFoundError if plan not found', async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ planId: 'nonexistent', userId: 'user-1', title: 'New' }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should update title', async () => {
    await useCase.execute({ planId: 'plan-1', userId: 'user-1', title: 'Novo Título' });

    expect(planRepository.update).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ title: 'Novo Título' }),
    );
  });

  it('should merge content updates with existing content', async () => {
    await useCase.execute({
      planId: 'plan-1',
      userId: 'user-1',
      content: { assessment: 'Testes escritos' },
    });

    expect(planRepository.update).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({
        content: expect.objectContaining({
          generalObjectives: ['Obj 1'],
          methodology: 'Expositivo',
          assessment: 'Testes escritos',
        }),
      }),
    );
  });

  it('should update status', async () => {
    await useCase.execute({
      planId: 'plan-1',
      userId: 'user-1',
      status: PlanStatus.APPROVED,
    });

    expect(planRepository.update).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ status: PlanStatus.APPROVED }),
    );
  });

  it('should not include empty fields in update', async () => {
    await useCase.execute({ planId: 'plan-1', userId: 'user-1' });

    expect(planRepository.update).toHaveBeenCalledWith('plan-1', {});
  });

  it('should invalidate cache when content is updated', async () => {
    await useCase.execute({
      planId: 'plan-1',
      userId: 'user-1',
      content: { assessment: 'Novo método' },
    });

    expect(cache.delete).toHaveBeenCalledWith(
      expect.stringContaining('plan:ANNUAL:dos-1'),
    );
  });

  it('should NOT invalidate cache when only title/status changes', async () => {
    await useCase.execute({
      planId: 'plan-1',
      userId: 'user-1',
      title: 'Novo Título',
      status: PlanStatus.APPROVED,
    });

    expect(cache.delete).not.toHaveBeenCalled();
  });
});
