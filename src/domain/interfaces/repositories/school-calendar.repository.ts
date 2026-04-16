import { SchoolCalendar, CalendarEvent, CalendarType } from '@/src/domain/entities/school-calendar.entity';

export interface CreateCalendarInput {
  userId: string;
  academicYear: string;
  country: string;
  schoolName?: string;
  type?: CalendarType;
  schoolId?: string;
  isActive?: boolean;
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
  findById(id: string): Promise<SchoolCalendar | null>;
  findByUserAndYear(userId: string, academicYear: string): Promise<SchoolCalendar | null>;
  findActiveMinisterial(academicYear: string): Promise<SchoolCalendar | null>;
  findBySchoolAndYear(schoolId: string, academicYear: string): Promise<SchoolCalendar | null>;
  findByType(type: CalendarType, academicYear?: string): Promise<SchoolCalendar[]>;
  findAllByUser(userId: string): Promise<SchoolCalendar[]>;
  create(input: CreateCalendarInput): Promise<SchoolCalendar>;
  update(id: string, data: Partial<Pick<SchoolCalendar, 'isActive' | 'schoolName' | 'schoolId' | 'version'>>): Promise<SchoolCalendar>;
  addEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent>;
  removeEvent(eventId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
