export enum CalendarEventType {
  NATIONAL_HOLIDAY = 'NATIONAL_HOLIDAY',
  SCHOOL_HOLIDAY = 'SCHOOL_HOLIDAY',
  TRIMESTER_BREAK = 'TRIMESTER_BREAK',
  EXAM_PERIOD = 'EXAM_PERIOD',
  MAKEUP_EXAM = 'MAKEUP_EXAM',
  PEDAGOGICAL_ACTIVITY = 'PEDAGOGICAL_ACTIVITY',
  SCHOOL_EVENT = 'SCHOOL_EVENT',
  CUSTOM = 'CUSTOM',
}

export interface CalendarTerm {
  id: string;
  calendarId: string;
  name: string;
  trimester: number;
  startDate: Date;
  endDate: Date;
  teachingWeeks: number;
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: CalendarEventType;
  allDay: boolean;
  createdAt: Date;
}

export interface SchoolCalendar {
  id: string;
  userId: string;
  academicYear: string;
  country: string;
  schoolName?: string;
  startDate: Date;
  endDate: Date;
  terms: CalendarTerm[];
  events: CalendarEvent[];
  createdAt: Date;
  updatedAt: Date;
}
