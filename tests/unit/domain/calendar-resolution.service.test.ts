import { describe, it, expect, vi } from 'vitest';
import { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';
import { CalendarType } from '@/src/domain/entities/school-calendar.entity';
import { PlanStatus, PlanType } from '@/src/domain/entities/plan.entity';
import { ValidationError } from '@/src/domain/errors/domain.error';
import type { Plan } from '@/src/domain/entities/plan.entity';
import type { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import type { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import type { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import type { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import type { ILogger } from '@/src/domain/interfaces/services/logger.service';
import type { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';

function createMockCalendar(overrides: Partial<SchoolCalendar> = {}): SchoolCalendar {
  return {
    id: 'cal-1',
    userId: 'admin-1',
    academicYear: '2025/2026',
    country: 'Angola',
    type: CalendarType.MINISTERIAL,
    isActive: true,
    version: 1,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-07-18'),
    terms: [],
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMocks() {
  const calendarRepository: ISchoolCalendarRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByUserAndYear: vi.fn().mockResolvedValue(null),
    findActiveMinisterial: vi.fn().mockResolvedValue(null),
    findBySchoolAndYear: vi.fn().mockResolvedValue(null),
    findByType: vi.fn().mockResolvedValue([]),
    findAllByUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    addEvent: vi.fn(),
    removeEvent: vi.fn(),
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

  const planRepository: IPlanRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    findByType: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    findByDosificacaoId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  };

  const cache: ICacheService = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteByPrefix: vi.fn().mockResolvedValue(0),
    has: vi.fn().mockResolvedValue(false),
  };

  const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  return { calendarRepository, userRepository, planRepository, cache, logger };
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test',
    emailVerified: true,
    onboardingCompleted: true,
    role: 'TEACHER' as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CalendarResolutionService', () => {
  // ===== resolve() =====

  it('should return selected calendar when user has one', async () => {
    const mocks = createMocks();
    const selectedCalendar = createMockCalendar({ id: 'cal-school', type: CalendarType.SCHOOL });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-school' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(selectedCalendar);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result).toBe(selectedCalendar);
    expect(mocks.calendarRepository.findById).toHaveBeenCalledWith('cal-school');
  });

  it('should fallback to ministerial when user has no selected calendar', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min', type: CalendarType.MINISTERIAL });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUser());
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result).toBe(ministerial);
    expect(mocks.calendarRepository.findActiveMinisterial).toHaveBeenCalledWith('2025/2026');
  });

  it('should fallback to ministerial when selected calendar is inactive', async () => {
    const mocks = createMocks();
    const inactiveCalendar = createMockCalendar({ id: 'cal-school', isActive: false });
    const ministerial = createMockCalendar({ id: 'cal-min' });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-school' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(inactiveCalendar);
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result).toBe(ministerial);
  });

  it('should fallback to legacy findByUserAndYear when no ministerial exists', async () => {
    const mocks = createMocks();
    const legacyCalendar = createMockCalendar({ id: 'cal-legacy', userId: 'user-1' });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUser());
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(null);
    vi.mocked(mocks.calendarRepository.findByUserAndYear).mockResolvedValue(legacyCalendar);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result).toBe(legacyCalendar);
    expect(mocks.calendarRepository.findByUserAndYear).toHaveBeenCalledWith('user-1', '2025/2026');
  });

  it('should return null when no calendar exists at all', async () => {
    const mocks = createMocks();

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result).toBeNull();
  });

  it('should return school calendar overriding ministerial when user selects it', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min', type: CalendarType.MINISTERIAL });
    const schoolCal = createMockCalendar({
      id: 'cal-school',
      type: CalendarType.SCHOOL,
      schoolId: 'school-1',
      schoolName: 'Instituto Nacional de Petróleos',
    });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-school' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(schoolCal);
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolve('user-1', '2025/2026');

    expect(result?.id).toBe('cal-school');
    expect(result?.type).toBe(CalendarType.SCHOOL);
    expect(mocks.calendarRepository.findActiveMinisterial).not.toHaveBeenCalled();
  });

  // ===== Observability (Improvement 5) =====

  it('should log resolution source when resolving via selection', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-1' });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-1' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    await service.resolve('user-1', '2025/2026');

    expect(mocks.logger.info).toHaveBeenCalledWith(
      'Calendar resolved via user selection',
      expect.objectContaining({ source: 'selected', fallbackUsed: false }),
    );
  });

  it('should log warning when selected calendar is inactive', async () => {
    const mocks = createMocks();
    const inactive = createMockCalendar({ id: 'cal-1', isActive: false });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-1' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(inactive);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    await service.resolve('user-1', '2025/2026');

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'Selected calendar inactive or missing, falling back',
      expect.objectContaining({ calendarActive: false }),
    );
  });

  it('should log fallback source when using ministerial', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min' });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUser());
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    await service.resolve('user-1', '2025/2026');

    expect(mocks.logger.info).toHaveBeenCalledWith(
      'Calendar resolved via ministerial fallback',
      expect.objectContaining({ source: 'ministerial', fallbackUsed: true }),
    );
  });

  // ===== changeCalendar() — Domain guard (Improvement 2) + Cache invalidation (Improvement 1) =====

  it('should change calendar when user has no plans', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-old' }),
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    await service.changeCalendar('user-1', 'cal-new');

    expect(mocks.userRepository.update).toHaveBeenCalledWith('user-1', { selectedCalendarId: 'cal-new' });
  });

  it('should throw ValidationError when calendar is inactive', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(
      createMockCalendar({ id: 'cal-dead', isActive: false }),
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'cal-dead')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when calendar not found', async () => {
    const mocks = createMocks();

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'nonexistent')).rejects.toThrow(ValidationError);
  });

  it('should block calendar change when user has existing plans', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-old' }),
    );
    vi.mocked(mocks.planRepository.findByUserId).mockResolvedValue({
      data: [{ id: 'plan-1', status: PlanStatus.GENERATED }] as never,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'cal-new')).rejects.toThrow(
      /não pode alterar o calendário/i,
    );
  });

  it('should log warning when calendar change is blocked', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-old' }),
    );
    vi.mocked(mocks.planRepository.findByUserId).mockResolvedValue({
      data: [{ id: 'plan-1', status: PlanStatus.GENERATED }] as never,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'cal-new')).rejects.toThrow();

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'Calendar change blocked — user has existing plans',
      expect.objectContaining({ planCount: 1 }),
    );
  });

  it('should invalidate cache on successful calendar change', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUser());

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    await service.changeCalendar('user-1', 'cal-new');

    expect(mocks.cache.deleteByPrefix).toHaveBeenCalledWith('plan:cal-new:');
  });

  it('should allow same calendar re-selection even with plans', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-same' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-same' }),
    );
    vi.mocked(mocks.planRepository.findByUserId).mockResolvedValue({
      data: [{ id: 'plan-1' }] as never,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    // Should not throw — same calendar re-selection is fine
    await service.changeCalendar('user-1', 'cal-same');
    expect(mocks.userRepository.update).toHaveBeenCalled();
  });

  // ===== getAvailableCalendars() — Clarity (Improvement 3) =====

  it('should list ministerial and school calendars for selection', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min' });
    const schoolCal = createMockCalendar({
      id: 'cal-school',
      type: CalendarType.SCHOOL,
      schoolName: 'Escola ABC',
      isActive: true,
    });

    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);
    vi.mocked(mocks.calendarRepository.findByType).mockResolvedValue([schoolCal]);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.getAvailableCalendars('user-1', '2025/2026', 'Escola ABC');

    expect(result.ministerial).toBe(ministerial);
    expect(result.schoolCalendars).toHaveLength(1);
    expect(result.schoolCalendars[0].schoolName).toBe('Escola ABC');
  });

  it('should return only ministerial when school has no custom calendar', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min' });

    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);
    vi.mocked(mocks.calendarRepository.findByType).mockResolvedValue([]);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.getAvailableCalendars('user-1', '2025/2026', 'Unknown School');

    expect(result.ministerial).toBe(ministerial);
    expect(result.schoolCalendars).toHaveLength(0);
  });

  it('should order school calendars before ministerial in options', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min' });
    const schoolCal = createMockCalendar({
      id: 'cal-school',
      type: CalendarType.SCHOOL,
      schoolName: 'Escola XYZ',
      isActive: true,
    });

    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);
    vi.mocked(mocks.calendarRepository.findByType).mockResolvedValue([schoolCal]);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.getAvailableCalendars('user-1', '2025/2026', 'Escola XYZ');

    expect(result.options).toHaveLength(2);
    // School calendar first
    expect(result.options[0].calendar.id).toBe('cal-school');
    expect(result.options[0].isRecommended).toBe(true);
    // Ministerial second, not recommended when school exists
    expect(result.options[1].calendar.id).toBe('cal-min');
    expect(result.options[1].isRecommended).toBe(false);
  });

  it('should mark ministerial as recommended when no school calendar exists', async () => {
    const mocks = createMocks();
    const ministerial = createMockCalendar({ id: 'cal-min' });

    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);
    vi.mocked(mocks.calendarRepository.findByType).mockResolvedValue([]);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.getAvailableCalendars('user-1', '2025/2026', 'Unknown');

    expect(result.options).toHaveLength(1);
    expect(result.options[0].isRecommended).toBe(true);
    expect(result.options[0].reason).toContain('Ministério');
  });

  // ===== P6: DRAFT plans should NOT block calendar change =====

  it('should allow calendar change when user only has DRAFT plans', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-old' }),
    );
    vi.mocked(mocks.planRepository.findByUserId).mockResolvedValue({
      data: [
        { id: 'plan-1', status: PlanStatus.DRAFT },
        { id: 'plan-2', status: PlanStatus.GENERATING },
      ] as never,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    // Should NOT throw — only DRAFT and GENERATING plans exist
    await service.changeCalendar('user-1', 'cal-new');
    expect(mocks.userRepository.update).toHaveBeenCalledWith('user-1', { selectedCalendarId: 'cal-new' });
  });

  it('should block calendar change when user has APPROVED plans', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-new' });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-old' }),
    );
    vi.mocked(mocks.planRepository.findByUserId).mockResolvedValue({
      data: [
        { id: 'plan-1', status: PlanStatus.DRAFT },
        { id: 'plan-2', status: PlanStatus.APPROVED },
      ] as never,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'cal-new')).rejects.toThrow(
      /não pode alterar o calendário/i,
    );
  });

  // ===== P5: Block SCHOOL calendar from another school =====

  it('should block selecting a SCHOOL calendar from another school', async () => {
    const mocks = createMocks();
    const otherSchoolCal = createMockCalendar({
      id: 'cal-other-school',
      type: CalendarType.SCHOOL,
      schoolName: 'Escola do Outro Lado',
    });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(otherSchoolCal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ school: 'Escola Primária ABC' }),
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await expect(service.changeCalendar('user-1', 'cal-other-school')).rejects.toThrow(
      /não pertence à sua escola/i,
    );
  });

  it('should allow selecting a SCHOOL calendar from the same school', async () => {
    const mocks = createMocks();
    const sameSchoolCal = createMockCalendar({
      id: 'cal-my-school',
      type: CalendarType.SCHOOL,
      schoolName: 'Escola Primária ABC',
    });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(sameSchoolCal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ school: 'Escola Primária ABC' }),
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    await service.changeCalendar('user-1', 'cal-my-school');
    expect(mocks.userRepository.update).toHaveBeenCalledWith('user-1', { selectedCalendarId: 'cal-my-school' });
  });

  it('should allow selecting a MINISTERIAL calendar regardless of school', async () => {
    const mocks = createMocks();
    const ministerialCal = createMockCalendar({
      id: 'cal-ministerial',
      type: CalendarType.MINISTERIAL,
    });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(ministerialCal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ school: 'Escola Primária ABC' }),
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    // MINISTERIAL calendars are not school-specific, should always be allowed
    await service.changeCalendar('user-1', 'cal-ministerial');
    expect(mocks.userRepository.update).toHaveBeenCalled();
  });

  it('should allow SCHOOL calendar when user has no school set', async () => {
    const mocks = createMocks();
    const schoolCal = createMockCalendar({
      id: 'cal-school',
      type: CalendarType.SCHOOL,
      schoolName: 'Escola XYZ',
    });

    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(schoolCal);
    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser(), // no school property
    );

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    // If user has no school set, we can't validate — allow it
    await service.changeCalendar('user-1', 'cal-school');
    expect(mocks.userRepository.update).toHaveBeenCalled();
  });

  // ===== resolveWithMetadata() — Melhoria 4 =====

  it('should return fallbackUsed=false and source=selected when user has active selected calendar', async () => {
    const mocks = createMocks();
    const cal = createMockCalendar({ id: 'cal-sel', type: CalendarType.SCHOOL });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-sel' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(cal);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolveWithMetadata('user-1', '2025/2026');

    expect(result.calendar).toBe(cal);
    expect(result.fallbackUsed).toBe(false);
    expect(result.source).toBe('selected');
  });

  it('should return fallbackUsed=true and source=ministerial when selected calendar is inactive', async () => {
    const mocks = createMocks();
    const inactive = createMockCalendar({ id: 'cal-dead', isActive: false });
    const ministerial = createMockCalendar({ id: 'cal-min' });

    vi.mocked(mocks.userRepository.findById).mockResolvedValue(
      createUser({ selectedCalendarId: 'cal-dead' }),
    );
    vi.mocked(mocks.calendarRepository.findById).mockResolvedValue(inactive);
    vi.mocked(mocks.calendarRepository.findActiveMinisterial).mockResolvedValue(ministerial);

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolveWithMetadata('user-1', '2025/2026');

    expect(result.calendar).toBe(ministerial);
    expect(result.fallbackUsed).toBe(true);
    expect(result.source).toBe('ministerial');
  });

  it('should return source=none when no calendar exists', async () => {
    const mocks = createMocks();

    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );
    const result = await service.resolveWithMetadata('user-1', '2025/2026');

    expect(result.calendar).toBeNull();
    expect(result.source).toBe('none');
  });

  // ===== isPlanOutdated() — Melhoria 2 =====

  it('should detect plan as outdated when calendar version differs', () => {
    const mocks = createMocks();
    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    const plan = {
      calendarId: 'cal-1',
      calendarVersion: 2,
    } as Plan;

    const calendar = createMockCalendar({ id: 'cal-1', version: 5 });

    expect(service.isPlanOutdated(plan, calendar)).toBe(true);
  });

  it('should not detect plan as outdated when version matches', () => {
    const mocks = createMocks();
    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    const plan = {
      calendarId: 'cal-1',
      calendarVersion: 3,
    } as Plan;

    const calendar = createMockCalendar({ id: 'cal-1', version: 3 });

    expect(service.isPlanOutdated(plan, calendar)).toBe(false);
  });

  it('should not detect plan as outdated when calendarVersion is missing', () => {
    const mocks = createMocks();
    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    const plan = {
      calendarId: 'cal-1',
    } as Plan;

    const calendar = createMockCalendar({ id: 'cal-1', version: 5 });

    // Legacy plans without calendarVersion should not be flagged
    expect(service.isPlanOutdated(plan, calendar)).toBe(false);
  });

  it('should not detect plan as outdated when calendar IDs differ', () => {
    const mocks = createMocks();
    const service = new CalendarResolutionService(
      mocks.calendarRepository, mocks.userRepository, mocks.planRepository, mocks.cache, mocks.logger,
    );

    const plan = {
      calendarId: 'cal-old',
      calendarVersion: 1,
    } as Plan;

    const calendar = createMockCalendar({ id: 'cal-new', version: 1 });

    // Different calendar entirely — not "outdated", just different
    expect(service.isPlanOutdated(plan, calendar)).toBe(false);
  });
});
