import { SchoolCalendar, CalendarEvent } from '@/src/domain/entities/school-calendar.entity';

export interface CreateCalendarInput {
  userId: string;
  academicYear: string;
  country: string;
  schoolName?: string;
  startDate: Date;
  endDate: Date;
  terms: {
    name: string;
    trimester: number;
    startDate: Date;
    endDate: Date;
    teachingWeeks: number;
  }[];
  events: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    type: string;
    allDay?: boolean;
  }[];
}

export interface ISchoolCalendarRepository {
  findByUserAndYear(userId: string, academicYear: string): Promise<SchoolCalendar | null>;
  findAllByUser(userId: string): Promise<SchoolCalendar[]>;
  create(input: CreateCalendarInput): Promise<SchoolCalendar>;
  addEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt'>): Promise<CalendarEvent>;
  removeEvent(eventId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
