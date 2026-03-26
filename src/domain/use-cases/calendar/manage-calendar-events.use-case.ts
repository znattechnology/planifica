import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { CalendarEvent, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
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
  ) {}

  async addEvent(userId: string, academicYear: string, input: AddEventInput): Promise<CalendarEvent> {
    const calendar = await this.calendarRepository.findByUserAndYear(userId, academicYear);
    if (!calendar) {
      throw new ValidationError('Calendário não encontrado');
    }
    if (calendar.userId !== userId) {
      throw new UnauthorizedError('Sem permissão');
    }

    return this.calendarRepository.addEvent(calendar.id, {
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      allDay: input.allDay ?? true,
    });
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
  }
}
