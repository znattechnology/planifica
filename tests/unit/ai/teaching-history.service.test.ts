import { describe, it, expect, vi } from 'vitest';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';
import { MIN_NOTE_LENGTH_FOR_DIFFICULTY } from '@/src/ai/config';
import type { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import type { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';

function createMockLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'les-1',
    planId: 'plan-1',
    userId: 'user-1',
    title: 'Aula 1',
    date: new Date('2025-10-01'),
    duration: 45,
    topic: 'Equações lineares',
    content: {},
    status: LessonStatus.DELIVERED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMocks() {
  const lessonRepository: ILessonRepository = {
    findById: vi.fn(),
    findByPlanId: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndSubject: vi.fn(),
    findCompletedByUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const activityRepository: ITeachingActivityRepository = {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByPeriod: vi.fn(),
    findBySubjectAndPeriod: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return { lessonRepository, activityRepository };
}

describe('TeachingHistoryService', () => {
  it('should return null when no completed lessons exist', async () => {
    const mocks = createMocks();
    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);

    const result = await service.buildContext('user-1', 'Matemática');
    expect(result).toBeNull();
  });

  it('should categorize delivered lessons as completed', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({ status: LessonStatus.DELIVERED, topic: 'Álgebra' }),
      createMockLesson({ id: 'les-2', status: LessonStatus.DELIVERED, topic: 'Geometria' }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    expect(result).not.toBeNull();
    expect(result!.completedTopics).toContain('Álgebra');
    expect(result!.completedTopics).toContain('Geometria');
    expect(result!.totalLessonsDelivered).toBe(2);
  });

  it('should categorize partial lessons as delayed', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({ status: LessonStatus.PARTIALLY_COMPLETED, topic: 'Funções' }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    expect(result!.delayedTopics).toContain('Funções');
    expect(result!.totalLessonsPartial).toBe(1);
  });

  it('should detect difficult topics from teacher notes', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({
        status: LessonStatus.DELIVERED,
        topic: 'Probabilidade',
        teacherNotes: 'Os alunos tiveram muita dificuldade com este tema',
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    expect(result!.difficultTopics).toContain('Probabilidade');
  });

  it('should compute duration ratio correctly', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({ status: LessonStatus.DELIVERED, duration: 45, actualDuration: 60 }),
      createMockLesson({ id: 'les-2', status: LessonStatus.DELIVERED, duration: 45, actualDuration: 50 }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    // (60 + 50) / (45 + 45) = 110/90 ≈ 1.22
    expect(result!.averageLessonDuration).toBeCloseTo(1.22, 1);
  });

  it('should build a summary string with adaptive instructions', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({ status: LessonStatus.DELIVERED, topic: 'Álgebra', duration: 45, actualDuration: 60 }),
      createMockLesson({ id: 'les-2', status: LessonStatus.NOT_COMPLETED, topic: 'Geometria' }),
      createMockLesson({
        id: 'les-3',
        status: LessonStatus.PARTIALLY_COMPLETED,
        topic: 'Funções',
        teacherNotes: 'Tema complexo, os alunos tiveram dificuldade',
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const summary = await service.buildFeedbackSummary('user-1', 'Matemática');

    expect(summary).not.toBeNull();
    expect(summary).toContain('HISTÓRICO DE EXECUÇÃO');
    expect(summary).toContain('Temas não dados: Geometria');
    expect(summary).toContain('Temas com atraso');
    expect(summary).toContain('Funções');
  });

  // ===== FIX-5: "problema" removed from difficulty markers =====

  it('should NOT flag "problema" as difficulty marker (FIX-5)', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({
        status: LessonStatus.DELIVERED,
        topic: 'Resolução de Problemas',
        teacherNotes: 'Aula de resolução de problema foi boa e produtiva',
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    // "problema" is no longer a difficulty marker
    expect(result!.difficultTopics).not.toContain('Resolução de Problemas');
  });

  // ===== FIX-6: Short notes ignored =====

  it('should ignore short notes like "Ok" or "Aula difícil" (FIX-6)', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({
        status: LessonStatus.DELIVERED,
        topic: 'Geometria',
        teacherNotes: 'Aula difícil',  // only 13 chars, below MIN_NOTE_LENGTH_FOR_DIFFICULTY
      }),
      createMockLesson({
        id: 'les-2',
        status: LessonStatus.DELIVERED,
        topic: 'Álgebra',
        teacherNotes: 'Ok',
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    // Short notes should not trigger difficulty detection
    expect(result!.difficultTopics).toHaveLength(0);
  });

  it('should detect difficulty from sufficiently long notes', async () => {
    const mocks = createMocks();
    const longNote = 'Os alunos acharam este tema muito difícil, precisamos revisitar';
    expect(longNote.length).toBeGreaterThanOrEqual(MIN_NOTE_LENGTH_FOR_DIFFICULTY);

    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({
        status: LessonStatus.DELIVERED,
        topic: 'Trigonometria',
        teacherNotes: longNote,
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    expect(result!.difficultTopics).toContain('Trigonometria');
  });

  it('should still collect short notes in recentNotes', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      createMockLesson({
        status: LessonStatus.DELIVERED,
        topic: 'Geometria',
        teacherNotes: 'Ok',
      }),
    ]);

    const service = new TeachingHistoryService(mocks.lessonRepository, mocks.activityRepository);
    const result = await service.buildContext('user-1', 'Matemática');

    // Short notes still collected in recentNotes (just not used for difficulty)
    expect(result!.recentNotes).toHaveLength(1);
    expect(result!.recentNotes[0]).toContain('Ok');
  });
});
