import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { CalendarEvent, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';

export interface AddEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: CalendarEventType;
  allDay?: boolean;
}

export class ManageCalendarEventsUseCase {
  constructor(
    private readonly calendarRepository: ISchoolCalendarRepository,
    private readonly cache?: ICacheService,
    private readonly logger?: ILogger,
  ) {}

  async addEvent(userId: string, academicYear: string, input: AddEventInput): Promise<CalendarEvent> {
    const calendar = await this.calendarRepository.findByUserAndYear(userId, academicYear);
    if (!calendar) {
      throw new ValidationError('Calendário não encontrado');
    }
    if (calendar.userId !== userId) {
      throw new UnauthorizedError('Sem permissão');
    }

    const event = await this.calendarRepository.addEvent(calendar.id, {
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      allDay: input.allDay ?? true,
      createdBy: userId,
    });

    // Invalidate plan cache — calendar events affect plan generation
    await this.invalidateCache('event_added', { calendarId: calendar.id, eventTitle: input.title });

    return event;
  }

  async removeEvent(userId: string, academicYear: string, eventId: string): Promise<void> {
    const calendar = await this.calendarRepository.findByUserAndYear(userId, academicYear);
    if (!calendar) {
      throw new ValidationError('Calendário não encontrado');
    }
    if (calendar.userId !== userId) {
      throw new UnauthorizedError('Sem permissão');
    }

    const event = calendar.events.find(e => e.id === eventId);
    if (!event) {
      throw new ValidationError('Evento não encontrado');
    }

    await this.calendarRepository.removeEvent(eventId);

    // Invalidate plan cache — calendar events affect plan generation
    await this.invalidateCache('event_removed', { calendarId: calendar.id, eventId });
  }

  private async invalidateCache(reason: string, context: Record<string, unknown>): Promise<void> {
    if (!this.cache) return;
    const calendarId = context.calendarId as string | undefined;
    const prefix = calendarId ? `plan:${calendarId}:` : 'plan:';
    const deleted = await this.cache.deleteByPrefix(prefix);
    this.logger?.info('Cache invalidated on calendar event change', {
      reason,
      prefix,
      entriesDeleted: deleted,
      ...context,
    });
  }
}
