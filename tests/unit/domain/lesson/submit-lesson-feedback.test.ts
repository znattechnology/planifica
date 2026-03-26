import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubmitLessonFeedbackUseCase } from '@/src/domain/use-cases/lesson/submit-lesson-feedback.use-case';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import type { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';

const mockLesson = {
  id: 'les-1',
  planId: 'plan-1',
  userId: 'user-1',
  title: 'Aula 1',
  date: new Date('2025-10-01'),
  duration: 45,
  topic: 'Equações lineares',
  content: {},
  status: LessonStatus.READY,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMocks() {
  const lessonRepository: ILessonRepository = {
    findById: vi.fn().mockResolvedValue(mockLesson),
    findByPlanId: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndSubject: vi.fn(),
    findCompletedByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({ ...mockLesson, ...data }),
    ),
    delete: vi.fn(),
  };
  return { lessonRepository };
}

describe('SubmitLessonFeedbackUseCase', () => {
  let useCase: SubmitLessonFeedbackUseCase;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new SubmitLessonFeedbackUseCase(mocks.lessonRepository);
  });

  it('should mark lesson as delivered with notes', async () => {
    const result = await useCase.execute({
      lessonId: 'les-1',
      userId: 'user-1',
      status: LessonStatus.DELIVERED,
      teacherNotes: 'Aula correu bem',
      actualDuration: 50,
    });

    expect(mocks.lessonRepository.update).toHaveBeenCalledWith(
      'les-1',
      expect.objectContaining({
        status: LessonStatus.DELIVERED,
        teacherNotes: 'Aula correu bem',
        actualDuration: 50,
        completedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(LessonStatus.DELIVERED);
  });

  it('should mark lesson as partially completed', async () => {
    await useCase.execute({
      lessonId: 'les-1',
      userId: 'user-1',
      status: LessonStatus.PARTIALLY_COMPLETED,
      teacherNotes: 'Não houve tempo para completar',
    });

    expect(mocks.lessonRepository.update).toHaveBeenCalledWith(
      'les-1',
      expect.objectContaining({
        status: LessonStatus.PARTIALLY_COMPLETED,
      }),
    );
  });

  it('should mark lesson as not completed', async () => {
    await useCase.execute({
      lessonId: 'les-1',
      userId: 'user-1',
      status: LessonStatus.NOT_COMPLETED,
    });

    expect(mocks.lessonRepository.update).toHaveBeenCalledWith(
      'les-1',
      expect.objectContaining({
        status: LessonStatus.NOT_COMPLETED,
        completedAt: expect.any(Date),
      }),
    );
  });

  it('should throw EntityNotFoundError if lesson not found', async () => {
    vi.mocked(mocks.lessonRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        lessonId: 'nonexistent',
        userId: 'user-1',
        status: LessonStatus.DELIVERED,
      }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should throw EntityNotFoundError if lesson belongs to different user', async () => {
    await expect(
      useCase.execute({
        lessonId: 'les-1',
        userId: 'other-user',
        status: LessonStatus.DELIVERED,
      }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should reject invalid feedback status', async () => {
    await expect(
      useCase.execute({
        lessonId: 'les-1',
        userId: 'user-1',
        status: LessonStatus.DRAFT,
      }),
    ).rejects.toThrow('Status inválido para feedback');
  });
});
