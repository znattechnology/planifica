import { prisma } from '@/src/infrastructure/database/prisma/client';
import { SchoolCalendar, CalendarEvent } from '@/src/domain/entities/school-calendar.entity';
import { ISchoolCalendarRepository, CreateCalendarInput } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { CalendarEventType } from '@prisma/client';

const calendarInclude = {
  terms: { orderBy: { trimester: 'asc' as const } },
  events: { orderBy: { startDate: 'asc' as const } },
};

function mapCalendar(raw: Record<string, unknown>): SchoolCalendar {
  return {
    ...(raw as unknown as SchoolCalendar),
    schoolName: (raw.schoolName as string) ?? undefined,
  };
}

export class PrismaSchoolCalendarRepository implements ISchoolCalendarRepository {
  async findByUserAndYear(userId: string, academicYear: string): Promise<SchoolCalendar | null> {
    const calendar = await prisma.schoolCalendar.findUnique({
      where: { userId_academicYear: { userId, academicYear } },
      include: calendarInclude,
    });
    return calendar ? mapCalendar(calendar as unknown as Record<string, unknown>) : null;
  }

  async findAllByUser(userId: string): Promise<SchoolCalendar[]> {
    const calendars = await prisma.schoolCalendar.findMany({
      where: { userId },
      include: calendarInclude,
      orderBy: { academicYear: 'desc' },
    });
    return calendars.map(c => mapCalendar(c as unknown as Record<string, unknown>));
  }

  async create(input: CreateCalendarInput): Promise<SchoolCalendar> {
    const calendar = await prisma.schoolCalendar.create({
      data: {
        userId: input.userId,
        academicYear: input.academicYear,
        country: input.country,
        schoolName: input.schoolName,
        startDate: input.startDate,
        endDate: input.endDate,
        terms: {
          create: input.terms.map(t => ({
            name: t.name,
            trimester: t.trimester,
            startDate: t.startDate,
            endDate: t.endDate,
            teachingWeeks: t.teachingWeeks,
          })),
        },
        events: {
          create: input.events.map(e => ({
            title: e.title,
            description: e.description,
            startDate: e.startDate,
            endDate: e.endDate,
            type: e.type as CalendarEventType,
            allDay: e.allDay ?? true,
          })),
        },
      },
      include: calendarInclude,
    });
    return mapCalendar(calendar as unknown as Record<string, unknown>);
  }

  async addEvent(
    calendarId: string,
    event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt'>,
  ): Promise<CalendarEvent> {
    return prisma.calendarEvent.create({
      data: {
        calendarId,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.type as CalendarEventType,
        allDay: event.allDay,
      },
    }) as unknown as CalendarEvent;
  }

  async removeEvent(eventId: string): Promise<void> {
    await prisma.calendarEvent.delete({ where: { id: eventId } });
  }

  async delete(id: string): Promise<void> {
    await prisma.schoolCalendar.delete({ where: { id } });
  }
}
