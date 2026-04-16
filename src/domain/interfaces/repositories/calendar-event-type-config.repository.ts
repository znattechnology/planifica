import { CalendarEventTypeConfig } from '@/src/domain/entities/calendar-event-type-config.entity';

export interface ICalendarEventTypeConfigRepository {
  findAll(): Promise<CalendarEventTypeConfig[]>;
  findBySchool(schoolId: string): Promise<CalendarEventTypeConfig[]>;
  findSystemTypes(): Promise<CalendarEventTypeConfig[]>;
  findById(id: string): Promise<CalendarEventTypeConfig | null>;
  create(input: Omit<CalendarEventTypeConfig, 'id' | 'createdAt'>): Promise<CalendarEventTypeConfig>;
  delete(id: string): Promise<void>;
}
