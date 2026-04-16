import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratePlanUseCase } from '@/src/domain/use-cases/plan/generate-plan.use-case';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';
import type { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import type { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import type { IAIPlanGeneratorService } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import type { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import type { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import type { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import type { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';

const mockDosificacao = {
  id: 'dos-1',
  userId: 'user-1',
  title: 'Matemática 10ª',
  subject: 'Matemática',
  grade: '10ª Classe',
  academicYear: '2025/2026',
  trimester: 1,
  content: {
    themes: [{ unit: '1', title: 'Álgebra', objectives: ['Resolver equações'], weeks: 4, contents: ['Equações lineares'] }],
    totalWeeks: 12,
    hoursPerWeek: 4,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlan = {
  id: 'plan-1',
  userId: 'user-1',
  type: PlanType.ANNUAL,
  title: 'Plano Anual - Matemática',
  subject: 'Matemática',
  grade: '10ª Classe',
  academicYear: '2025/2026',
  content: { generalObjectives: [], specificObjectives: [], competencies: [], topics: [] },
  status: PlanStatus.GENERATING,
  dosificacaoId: 'dos-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMocks() {
  const planRepository: IPlanRepository = {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByType: vi.fn(),
    findByDosificacaoId: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(mockPlan),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
  };

  const dosificacaoRepository: IDosificacaoRepository = {
    findById: vi.fn().mockResolvedValue(mockDosificacao),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const aiService: IAIPlanGeneratorService = {
    generatePlan: vi.fn().mockResolvedValue({
      generalObjectives: ['Objectivo 1'],
      specificObjectives: ['Objectivo específico 1'],
      competencies: ['Competência 1'],
      topics: [{ title: 'Álgebra', subtopics: ['Equações'] }],
      methodology: 'Expositivo',
      resources: ['Manual'],
      assessment: 'Testes escritos',
    }),
  };

  const schoolCalendarRepository: ISchoolCalendarRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByUserAndYear: vi.fn().mockResolvedValue(null),
    findActiveMinisterial: vi.fn().mockResolvedValue(null),
    findBySchoolAndYear: vi.fn().mockResolvedValue(null),
    findByType: vi.fn().mockResolvedValue([]),
    findAllByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addEvent: vi.fn(),
    removeEvent: vi.fn(),
    delete: vi.fn(),
  };

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

  const userRepository: IUserRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    findByIdWithPassword: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
    findBySchool: vi.fn(),
    countByRole: vi.fn(),
  };

  return { planRepository, dosificacaoRepository, aiService, schoolCalendarRepository, lessonRepository, activityRepository, userRepository };
}

describe('GeneratePlanUseCase', () => {
  let useCase: GeneratePlanUseCase;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    const calendarResolution = new CalendarResolutionService(
      mocks.schoolCalendarRepository,
      mocks.userRepository,
    );
    useCase = new GeneratePlanUseCase(
      mocks.planRepository,
      mocks.dosificacaoRepository,
      mocks.aiService,
      mocks.schoolCalendarRepository,
      mocks.lessonRepository,
      mocks.activityRepository,
      calendarResolution,
    );
  });

  it('should create plan with GENERATING status and return immediately', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Plano Anual - Matemática',
    });

    expect(result.id).toBe('plan-1');
    expect(result.status).toBe(PlanStatus.GENERATING);
    expect(mocks.planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: PlanType.ANNUAL,
        status: PlanStatus.GENERATING,
        dosificacaoId: 'dos-1',
        subject: 'Matemática',
        grade: '10ª Classe',
      }),
    );
  });

  it('should throw if dosificacaoId is not provided and no parent plan', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: PlanType.ANNUAL,
        title: 'Test',
      }),
    ).rejects.toThrow('dosificacaoId is required');
  });

  it('should throw EntityNotFoundError if dosificacao not found', async () => {
    vi.mocked(mocks.dosificacaoRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        dosificacaoId: 'nonexistent',
        type: PlanType.ANNUAL,
        title: 'Test',
      }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should resolve dosificacaoId from parent plan', async () => {
    const parentPlan = {
      ...mockPlan,
      id: 'parent-1',
      status: PlanStatus.GENERATED,
      dosificacaoId: 'dos-1',
      content: { generalObjectives: ['Parent obj'], specificObjectives: [], competencies: [], topics: [] },
    };
    vi.mocked(mocks.planRepository.findById).mockResolvedValue(parentPlan);

    await useCase.execute({
      userId: 'user-1',
      parentPlanId: 'parent-1',
      type: PlanType.TRIMESTER,
      title: 'Plano Trimestral',
    });

    expect(mocks.planRepository.findById).toHaveBeenCalledWith('parent-1');
    expect(mocks.dosificacaoRepository.findById).toHaveBeenCalledWith('dos-1');
  });

  it('should throw EntityNotFoundError if parent plan not found', async () => {
    vi.mocked(mocks.planRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        parentPlanId: 'nonexistent',
        type: PlanType.TRIMESTER,
        title: 'Test',
      }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should fire AI generation in background', async () => {
    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PlanType.ANNUAL,
        subject: 'Matemática',
        grade: '10ª Classe',
      }),
    );
  });

  it('should update plan to GENERATED on AI success', async () => {
    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    await vi.waitFor(() => {
      expect(mocks.planRepository.update).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({ status: PlanStatus.GENERATED }),
      );
    });
  });

  it('should revert plan to DRAFT with error on AI failure', async () => {
    vi.mocked(mocks.aiService.generatePlan).mockRejectedValue(new Error('AI service down'));

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    await vi.waitFor(() => {
      expect(mocks.planRepository.update).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          status: PlanStatus.DRAFT,
          content: expect.objectContaining({
            criticalNotes: expect.stringContaining('AI service down'),
          }),
        }),
      );
    });
  });

  it('should pass calendar context to AI when calendar exists', async () => {
    const mockCalendar = {
      id: 'cal-1',
      userId: 'user-1',
      academicYear: '2025/2026',
      country: 'Angola',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [
        { id: 't1', calendarId: 'cal-1', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-12'), teachingWeeks: 12, createdAt: new Date() },
        { id: 't2', calendarId: 'cal-1', name: '2.º Trimestre', trimester: 2, startDate: new Date('2026-01-08'), endDate: new Date('2026-03-28'), teachingWeeks: 11, createdAt: new Date() },
      ],
      events: [
        { id: 'e1', calendarId: 'cal-1', title: 'Dia da Independência', startDate: new Date('2025-11-11'), endDate: new Date('2025-11-11'), type: 'NATIONAL_HOLIDAY', allDay: true, createdAt: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mocks.schoolCalendarRepository.findByUserAndYear).mockResolvedValue(mockCalendar);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Trimestral',
      trimester: 1,
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarContext: expect.objectContaining({
          terms: expect.arrayContaining([
            expect.objectContaining({ trimester: 1, teachingWeeks: 12 }),
          ]),
          events: expect.arrayContaining([
            expect.objectContaining({ title: 'Dia da Independência' }),
          ]),
        }),
      }),
    );
  });

  it('should gracefully proceed without calendar when none exists', async () => {
    vi.mocked(mocks.schoolCalendarRepository.findByUserAndYear).mockResolvedValue(null);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarContext: undefined,
      }),
    );
  });

  it('should include sibling plan summaries for trimester plans', async () => {
    vi.mocked(mocks.schoolCalendarRepository.findByUserAndYear).mockResolvedValue(null);
    const existingTrimesterPlan = {
      ...mockPlan,
      id: 'sibling-1',
      type: PlanType.TRIMESTER,
      title: 'Dosificação 1º Trimestre',
      status: PlanStatus.GENERATED,
      content: {
        generalObjectives: ['Resolver equações lineares'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra Básica' }, { title: 'Equações do 1º grau' }],
      },
    };
    vi.mocked(mocks.planRepository.findByDosificacaoId).mockResolvedValue([existingTrimesterPlan]);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Dosificação 2º Trimestre',
      trimester: 2,
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        siblingPlanSummaries: [
          expect.objectContaining({
            title: 'Dosificação 1º Trimestre',
            topicTitles: ['Álgebra Básica', 'Equações do 1º grau'],
            generalObjectives: ['Resolver equações lineares'],
          }),
        ],
      }),
    );
  });

  it('should extract focus week data from parent trimester plan for biweekly generation', async () => {
    const parentPlan = {
      ...mockPlan,
      id: 'parent-trim-1',
      type: PlanType.TRIMESTER,
      status: PlanStatus.GENERATED,
      dosificacaoId: 'dos-1',
      content: {
        generalObjectives: ['Obj geral'],
        specificObjectives: [],
        competencies: [],
        topics: [{ title: 'Álgebra' }],
        weeklyPlan: [
          { week: '1ª', period: '02/09 A 06/09', unit: 'I', objectives: 'Obj semana 1', contents: 'Conteúdo semana 1', numLessons: 2 },
          { week: '2ª', period: '09/09 A 13/09', unit: 'I', objectives: 'Obj semana 2', contents: 'Conteúdo semana 2', numLessons: 2 },
          { week: '3ª', period: '16/09 A 20/09', unit: 'I', objectives: 'Obj semana 3', contents: 'Conteúdo semana 3', numLessons: 2 },
          { week: '4ª', period: '23/09 A 27/09', unit: 'II', objectives: 'Obj semana 4', contents: 'Conteúdo semana 4', numLessons: 2 },
        ],
        totalWeeks: 4,
        totalLessons: 8,
      },
    };
    vi.mocked(mocks.planRepository.findById).mockResolvedValue(parentPlan);

    await useCase.execute({
      userId: 'user-1',
      parentPlanId: 'parent-trim-1',
      type: PlanType.BIWEEKLY,
      title: 'Quinzenal Semanas 3-4',
      trimester: 1,
      week: 3,
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        focusWeekData: expect.objectContaining({
          weekIndex: 2,
          totalWeeksInParent: 4,
          weeks: [
            expect.objectContaining({ week: '3ª', objectives: 'Obj semana 3' }),
            expect.objectContaining({ week: '4ª', objectives: 'Obj semana 4' }),
          ],
        }),
      }),
    );
  });

  it('should store trimester and weekIndex in created plan', async () => {
    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Test',
      trimester: 2,
      week: 5,
    });

    expect(mocks.planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trimester: 2,
        weekIndex: 5,
      }),
    );
  });

  it('should include teaching history in AI generation when feedback exists', async () => {
    // Simulate completed lessons with feedback
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([
      {
        id: 'les-1',
        planId: 'plan-x',
        userId: 'user-1',
        title: 'Aula 1',
        date: new Date(),
        duration: 45,
        topic: 'Álgebra',
        content: {} as never,
        status: 'DELIVERED' as never,
        teacherNotes: 'Tema difícil, dificuldade dos alunos',
        actualDuration: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Test',
      trimester: 2,
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        teachingHistory: expect.stringContaining('HISTÓRICO DE EXECUÇÃO'),
      }),
    );
  });

  it('should proceed without teaching history when no lessons exist', async () => {
    vi.mocked(mocks.lessonRepository.findCompletedByUser).mockResolvedValue([]);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        teachingHistory: undefined,
      }),
    );
  });

  // ===== Multi-calendar resolution tests =====

  it('should use user-selected calendar instead of user-owned calendar', async () => {
    const selectedCalendar = {
      id: 'cal-school',
      userId: 'admin-1',
      academicYear: '2025/2026',
      country: 'Angola',
      type: 'SCHOOL' as const,
      schoolId: 'school-1',
      isActive: true,
      version: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [
        { id: 't1', calendarId: 'cal-school', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-12'), teachingWeeks: 10, createdAt: new Date() },
      ],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // User has a selectedCalendarId
    vi.mocked(mocks.userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      emailVerified: true,
      onboardingCompleted: true,
      role: 'TEACHER' as never,
      selectedCalendarId: 'cal-school',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.schoolCalendarRepository.findById).mockResolvedValue(selectedCalendar);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Trimestral',
      trimester: 1,
    });

    // Should call findById (from CalendarResolutionService), NOT findByUserAndYear
    expect(mocks.schoolCalendarRepository.findById).toHaveBeenCalledWith('cal-school');
    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarContext: expect.objectContaining({
          terms: expect.arrayContaining([
            expect.objectContaining({ trimester: 1, teachingWeeks: 10 }),
          ]),
        }),
      }),
    );
  });

  it('should fallback to ministerial when user has no selected calendar', async () => {
    const ministerialCal = {
      id: 'cal-min',
      userId: 'admin-1',
      academicYear: '2025/2026',
      country: 'Angola',
      type: 'MINISTERIAL' as const,
      isActive: true,
      version: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [
        { id: 't1', calendarId: 'cal-min', name: '1.º Trimestre', trimester: 1, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-12'), teachingWeeks: 12, createdAt: new Date() },
      ],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // User exists but has no selectedCalendarId
    vi.mocked(mocks.userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      emailVerified: true,
      onboardingCompleted: true,
      role: 'TEACHER' as never,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.schoolCalendarRepository.findActiveMinisterial).mockResolvedValue(ministerialCal);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.TRIMESTER,
      title: 'Trimestral',
      trimester: 1,
    });

    expect(mocks.schoolCalendarRepository.findActiveMinisterial).toHaveBeenCalledWith('2025/2026');
    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarContext: expect.objectContaining({
          terms: expect.arrayContaining([
            expect.objectContaining({ trimester: 1, teachingWeeks: 12 }),
          ]),
        }),
      }),
    );
  });

  it('should persist calendarId in created plan for provenance tracking', async () => {
    const cal = {
      id: 'cal-track',
      userId: 'admin-1',
      academicYear: '2025/2026',
      country: 'Angola',
      type: 'MINISTERIAL' as const,
      isActive: true,
      version: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mocks.userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      emailVerified: true,
      onboardingCompleted: true,
      role: 'TEACHER' as never,
      selectedCalendarId: 'cal-track',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.schoolCalendarRepository.findById).mockResolvedValue(cal);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Plano Anual',
    });

    expect(mocks.planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'cal-track',
      }),
    );
  });

  it('should persist undefined calendarId when no calendar exists', async () => {
    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    expect(mocks.planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: undefined,
        calendarVersion: undefined,
      }),
    );
  });

  // ===== Melhoria 1: calendarVersion tracking =====

  it('should persist calendarVersion alongside calendarId', async () => {
    const cal = {
      id: 'cal-v3',
      userId: 'admin-1',
      academicYear: '2025/2026',
      country: 'Angola',
      type: 'MINISTERIAL' as const,
      isActive: true,
      version: 3,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mocks.userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      emailVerified: true,
      onboardingCompleted: true,
      role: 'TEACHER' as never,
      selectedCalendarId: 'cal-v3',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.schoolCalendarRepository.findById).mockResolvedValue(cal);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Plano Anual',
    });

    expect(mocks.planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'cal-v3',
        calendarVersion: 3,
      }),
    );
  });

  // ===== Melhoria 3: Cache key includes calendarId =====

  it('should pass calendarId in generatePlan input for cache keying', async () => {
    const cal = {
      id: 'cal-cache-key',
      userId: 'admin-1',
      academicYear: '2025/2026',
      country: 'Angola',
      type: 'MINISTERIAL' as const,
      isActive: true,
      version: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-18'),
      terms: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mocks.userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      emailVerified: true,
      onboardingCompleted: true,
      role: 'TEACHER' as never,
      selectedCalendarId: 'cal-cache-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.schoolCalendarRepository.findById).mockResolvedValue(cal);

    await useCase.execute({
      userId: 'user-1',
      dosificacaoId: 'dos-1',
      type: PlanType.ANNUAL,
      title: 'Test',
    });

    // Wait for background generation to fire
    await new Promise(r => setTimeout(r, 50));

    expect(mocks.aiService.generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'cal-cache-key',
      }),
    );
  });
});
