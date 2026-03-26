import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AggregateActivitiesUseCase } from '@/src/domain/use-cases/report/aggregate-activities.use-case';
import { ActivityType } from '@/src/domain/entities/teaching-activity.entity';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';
import type { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import type { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';

const startDate = new Date('2025-01-06');
const endDate = new Date('2025-03-28');

const mockActivities = [
  {
    id: 'act-1',
    userId: 'user-1',
    type: ActivityType.LESSON_DELIVERED,
    subject: 'Matemática',
    grade: '10ª',
    topic: 'Álgebra',
    description: 'Equações lineares',
    date: new Date('2025-01-10'),
    duration: 90,
    studentCount: 35,
    outcomes: ['Boa participação'],
    challenges: ['Falta de material'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'act-2',
    userId: 'user-1',
    type: ActivityType.ASSESSMENT_GIVEN,
    subject: 'Matemática',
    grade: '10ª',
    topic: 'Geometria',
    description: 'Mini-teste',
    date: new Date('2025-02-15'),
    duration: 45,
    studentCount: 30,
    outcomes: ['Notas médias'],
    challenges: ['Falta de material', 'Turma grande'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockLessons = [
  {
    id: 'lesson-1',
    userId: 'user-1',
    planId: 'plan-1',
    title: 'Aula de Trigonometria',
    topic: 'Trigonometria',
    content: {} as any,
    status: LessonStatus.DELIVERED,
    date: new Date('2025-03-01'),
    duration: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'lesson-2',
    userId: 'user-1',
    planId: 'plan-1',
    title: 'Aula de Funções',
    topic: 'Funções',
    content: {} as any,
    status: LessonStatus.DRAFT,
    date: new Date('2025-03-10'),
    duration: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('AggregateActivitiesUseCase', () => {
  let useCase: AggregateActivitiesUseCase;
  let activityRepository: ITeachingActivityRepository;
  let lessonRepository: ILessonRepository;

  beforeEach(() => {
    activityRepository = {
      findBySubjectAndPeriod: vi.fn().mockResolvedValue(mockActivities),
      findByPeriod: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    lessonRepository = {
      findByUserId: vi.fn().mockResolvedValue(mockLessons),
      findByPlanId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new AggregateActivitiesUseCase(activityRepository, lessonRepository);
  });

  it('should aggregate activities and delivered lessons', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    // 2 activities + 1 delivered lesson = 3 total
    expect(result.totalLessons).toBe(3);
    expect(result.subject).toBe('Matemática');
    expect(result.grade).toBe('10ª');
  });

  it('should calculate total hours correctly', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    // (90 + 45 + 45) / 60 = 3.0 hours
    expect(result.totalHours).toBe(3);
  });

  it('should collect unique topics from activities and lessons', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    expect(result.topicsCovered).toContain('Álgebra');
    expect(result.topicsCovered).toContain('Geometria');
    expect(result.topicsCovered).toContain('Trigonometria');
    // PLANNED lesson (Funções) should NOT be included
    expect(result.topicsCovered).not.toContain('Funções');
  });

  it('should calculate average student count', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    // (35 + 30) / 2 = 32.5 → 33 (rounded)
    expect(result.averageStudentCount).toBe(33);
  });

  it('should sort challenges by frequency', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    // 'Falta de material' appears twice, 'Turma grande' once
    expect(result.commonChallenges[0]).toBe('Falta de material');
    expect(result.commonChallenges).toContain('Turma grande');
  });

  it('should return 0 average student count when no student data', async () => {
    vi.mocked(activityRepository.findBySubjectAndPeriod).mockResolvedValue([
      { ...mockActivities[0], studentCount: undefined },
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    expect(result.averageStudentCount).toBe(0);
  });

  it('should include date range in result', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      subject: 'Matemática',
      grade: '10ª',
      startDate,
      endDate,
    });

    expect(result.dateRange.start).toEqual(startDate);
    expect(result.dateRange.end).toEqual(endDate);
  });
});
