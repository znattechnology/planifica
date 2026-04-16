import type { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';
import type { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';
import type { ResolutionSource } from '@/src/domain/services/calendar-resolution.service';

export interface CalendarContextResult {
  calendarContext?: CalendarContext;
  calendarInfo?: {
    id: string;
    type: string;
    version: number;
  };
  fallbackUsed: boolean;
  source: ResolutionSource;
}

/**
 * Convert a SchoolCalendar entity to CalendarContext for AI services.
 */
export function toCalendarContext(calendar: SchoolCalendar): CalendarContext {
  return {
    terms: calendar.terms.map(t => ({
      trimester: t.trimester,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      teachingWeeks: t.teachingWeeks,
    })),
    events: calendar.events.map(e => ({
      title: e.title,
      startDate: e.startDate.toISOString().split('T')[0],
      endDate: e.endDate.toISOString().split('T')[0],
      type: e.type,
    })),
  };
}

/**
 * Resolve and convert calendar context for a user.
 * Uses CalendarResolutionService with fallback logic.
 */
export async function resolveCalendarContext(
  userId: string,
  academicYear: string,
  calendarResolution: CalendarResolutionService,
): Promise<CalendarContext | undefined> {
  try {
    const calendar = await calendarResolution.resolve(userId, academicYear);
    return calendar ? toCalendarContext(calendar) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve calendar context with full metadata (fallbackUsed, source, calendarInfo).
 * Use this in API routes that expose resolution details to the frontend.
 */
export async function resolveCalendarContextWithMetadata(
  userId: string,
  academicYear: string,
  calendarResolution: CalendarResolutionService,
): Promise<CalendarContextResult> {
  try {
    const result = await calendarResolution.resolveWithMetadata(userId, academicYear);
    if (!result.calendar) {
      return { fallbackUsed: result.fallbackUsed, source: result.source };
    }
    return {
      calendarContext: toCalendarContext(result.calendar),
      calendarInfo: {
        id: result.calendar.id,
        type: result.calendar.type,
        version: result.calendar.version,
      },
      fallbackUsed: result.fallbackUsed,
      source: result.source,
    };
  } catch {
    return { fallbackUsed: false, source: 'none' };
  }
}
