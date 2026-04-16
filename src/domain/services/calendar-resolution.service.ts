import { SchoolCalendar, CalendarType } from '@/src/domain/entities/school-calendar.entity';
import type { Plan } from '@/src/domain/entities/plan.entity';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { PlanStatus } from '@/src/domain/entities/plan.entity';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { ValidationError } from '@/src/domain/errors/domain.error';

export interface AvailableCalendar {
  calendar: SchoolCalendar;
  isRecommended: boolean;
  reason?: string;
}

export interface AvailableCalendarsResult {
  ministerial: SchoolCalendar | null;
  schoolCalendars: SchoolCalendar[];
  /** Ordered list with recommendation metadata */
  options: AvailableCalendar[];
}

export type ResolutionSource = 'selected' | 'ministerial' | 'legacy' | 'none';

export interface CalendarResolveResult {
  calendar: SchoolCalendar | null;
  fallbackUsed: boolean;
  source: ResolutionSource;
}

/**
 * Single source of truth for resolving which calendar a user should use.
 *
 * Resolution order:
 * 1. user.selectedCalendarId → findById
 * 2. Fallback → active MINISTERIAL calendar for that academic year
 * 3. Fallback → user's own calendar for that year (legacy path)
 */
export class CalendarResolutionService {
  constructor(
    private readonly calendarRepository: ISchoolCalendarRepository,
    private readonly userRepository: IUserRepository,
    private readonly planRepository?: IPlanRepository,
    private readonly cache?: ICacheService,
    private readonly logger?: ILogger,
  ) {}

  /**
   * Resolve calendar — backward-compatible version returning just the calendar.
   */
  async resolve(userId: string, academicYear: string): Promise<SchoolCalendar | null> {
    const result = await this.resolveWithMetadata(userId, academicYear);
    return result.calendar;
  }

  /**
   * Resolve calendar with metadata about the resolution process.
   * Returns fallbackUsed and source so callers (APIs) can inform the frontend.
   */
  async resolveWithMetadata(userId: string, academicYear: string): Promise<CalendarResolveResult> {
    // Step 1: Check if user has a selected calendar
    const user = await this.userRepository.findById(userId);
    if (user?.selectedCalendarId) {
      const selected = await this.calendarRepository.findById(user.selectedCalendarId);
      if (selected && selected.isActive) {
        this.logger?.info('Calendar resolved via user selection', {
          userId,
          calendarId: selected.id,
          calendarType: selected.type,
          source: 'selected',
          fallbackUsed: false,
        });
        return { calendar: selected, fallbackUsed: false, source: 'selected' };
      }
      // Selected calendar is inactive or deleted — fall through to ministerial
      this.logger?.warn('Selected calendar inactive or missing, falling back', {
        userId,
        selectedCalendarId: user.selectedCalendarId,
        calendarFound: !!selected,
        calendarActive: selected?.isActive ?? false,
      });
    }

    // Step 2: Fallback to active ministerial calendar
    const ministerial = await this.calendarRepository.findActiveMinisterial(academicYear);
    if (ministerial) {
      this.logger?.info('Calendar resolved via ministerial fallback', {
        userId,
        calendarId: ministerial.id,
        source: 'ministerial',
        fallbackUsed: true,
      });
      return { calendar: ministerial, fallbackUsed: true, source: 'ministerial' };
    }

    // Step 3: Legacy fallback — user's own calendar for that year
    const legacy = await this.calendarRepository.findByUserAndYear(userId, academicYear);
    if (legacy) {
      this.logger?.info('Calendar resolved via legacy fallback', {
        userId,
        calendarId: legacy.id,
        source: 'legacy',
        fallbackUsed: true,
      });
      return { calendar: legacy, fallbackUsed: true, source: 'legacy' };
    }

    this.logger?.warn('No calendar found for user', {
      userId,
      academicYear,
      source: 'none',
    });
    return { calendar: null, fallbackUsed: false, source: 'none' };
  }

  /**
   * Check if a plan was generated with an outdated calendar version.
   */
  isPlanOutdated(plan: Plan, currentCalendar: SchoolCalendar): boolean {
    if (!plan.calendarId || !plan.calendarVersion) return false;
    return plan.calendarId === currentCalendar.id && plan.calendarVersion !== currentCalendar.version;
  }

  /**
   * Change the user's selected calendar with domain-level guard.
   * Throws ValidationError if user already has generated plans (prevents mid-stream switching).
   */
  async changeCalendar(userId: string, calendarId: string): Promise<void> {
    // Validate calendar exists and is active
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar || !calendar.isActive) {
      throw new ValidationError('Calendário não encontrado ou inactivo');
    }

    // P5: Block selection of SCHOOL calendars from another school
    const user = await this.userRepository.findById(userId);
    if (calendar.type === CalendarType.SCHOOL && user?.school && calendar.schoolName) {
      if (user.school.toLowerCase() !== calendar.schoolName.toLowerCase()) {
        throw new ValidationError('Este calendário não pertence à sua escola');
      }
    }

    // P6: Only block calendar change for non-draft plans (GENERATED, REVIEWED, APPROVED)
    const blockingStatuses = [PlanStatus.GENERATED, PlanStatus.REVIEWED, PlanStatus.APPROVED];
    if (user?.selectedCalendarId && user.selectedCalendarId !== calendarId && this.planRepository) {
      const userPlans = await this.planRepository.findByUserId(userId);
      const blockingPlans = userPlans.data.filter(p => blockingStatuses.includes(p.status as PlanStatus));
      if (blockingPlans.length > 0) {
        this.logger?.warn('Calendar change blocked — user has existing plans', {
          userId,
          currentCalendarId: user.selectedCalendarId,
          requestedCalendarId: calendarId,
          planCount: blockingPlans.length,
        });
        throw new ValidationError(
          'Não pode alterar o calendário após criar planos. Os planos existentes podem ficar desalinhados.',
        );
      }
    }

    // Update user's selected calendar
    await this.userRepository.update(userId, { selectedCalendarId: calendarId });

    // Invalidate cached plan data — clear both old and new calendar prefixes
    if (this.cache) {
      let deleted = 0;
      if (user?.selectedCalendarId) {
        deleted += await this.cache.deleteByPrefix(`plan:${user.selectedCalendarId}:`);
      }
      deleted += await this.cache.deleteByPrefix(`plan:${calendarId}:`);
      // Also clear entries without calendarId (legacy keys)
      deleted += await this.cache.deleteByPrefix('plan:_:');
      this.logger?.info('Cache invalidated on calendar change', {
        userId,
        calendarId,
        entriesDeleted: deleted,
      });
    }

    this.logger?.info('Calendar changed successfully', {
      userId,
      calendarId,
      calendarType: calendar.type,
    });
  }

  /**
   * Invalidate plan-related caches.
   * When calendarId is provided, only invalidates entries for that calendar.
   * Falls back to clearing all plan cache if no calendarId given.
   */
  async invalidateCalendarCache(reason: string, context?: Record<string, unknown>): Promise<void> {
    if (!this.cache) return;
    const calendarId = context?.calendarId as string | undefined;
    const prefix = calendarId ? `plan:${calendarId}:` : 'plan:';
    const deleted = await this.cache.deleteByPrefix(prefix);
    this.logger?.info('Cache invalidated', {
      reason,
      prefix,
      entriesDeleted: deleted,
      ...context,
    });
  }

  /**
   * Get available calendars for a user to choose from during onboarding/settings.
   * Returns ministerial + school-specific calendars with recommendation metadata.
   * School calendars appear first (more specific), ministerial as default fallback.
   */
  async getAvailableCalendars(
    userId: string,
    academicYear: string,
    schoolName?: string,
  ): Promise<AvailableCalendarsResult> {
    const ministerial = await this.calendarRepository.findActiveMinisterial(academicYear);

    // Fetch ALL active school calendars for this year — user sees every option
    const allSchoolCals = await this.calendarRepository.findByType('SCHOOL' as CalendarType, academicYear);
    const schoolCalendars = allSchoolCals.filter(c => c.isActive);

    // Determine which school calendar matches the user's school (for recommendation)
    const normalizedSchool = schoolName?.toLowerCase().trim();
    const matchingSchool = normalizedSchool
      ? schoolCalendars.find(c => c.schoolName?.toLowerCase().trim() === normalizedSchool)
      : undefined;

    // Build ordered options: matching school first, then other schools, then ministerial
    const options: AvailableCalendar[] = [];

    // User's school calendar first (if found) — recommended
    if (matchingSchool) {
      options.push({
        calendar: matchingSchool,
        isRecommended: true,
        reason: `Calendário da sua escola (${matchingSchool.schoolName})`,
      });
    }

    // Other school calendars — available but not recommended
    for (const sc of schoolCalendars) {
      if (sc.id === matchingSchool?.id) continue; // already added above
      options.push({
        calendar: sc,
        isRecommended: false,
        reason: `Calendário da ${sc.schoolName || 'escola'}`,
      });
    }

    // Ministerial — recommended only when no school calendar matches the user's school
    if (ministerial) {
      options.push({
        calendar: ministerial,
        isRecommended: !matchingSchool,
        reason: !matchingSchool
          ? 'Calendário oficial do Ministério da Educação (recomendado)'
          : 'Calendário padrão ministerial (genérico)',
      });
    }

    this.logger?.debug('Available calendars fetched', {
      userId,
      academicYear,
      schoolName,
      ministerialFound: !!ministerial,
      schoolCalendarCount: schoolCalendars.length,
      matchingSchoolFound: !!matchingSchool,
      totalOptions: options.length,
    });

    return { ministerial, schoolCalendars, options };
  }
}
