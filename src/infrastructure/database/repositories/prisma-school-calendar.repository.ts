import { prisma } from '@/src/infrastructure/database/prisma/client';
import { SchoolCalendar, CalendarEvent, CalendarType } from '@/src/domain/entities/school-calendar.entity';
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
    schoolId: (raw.schoolId as string) ?? undefined,
    type: (raw.type as CalendarType) ?? CalendarType.MINISTERIAL,
    isActive: (raw.isActive as boolean) ?? true,
    version: (raw.version as number) ?? 1,
  };
}

export class PrismaSchoolCalendarRepository implements ISchoolCalendarRepository {
  async findById(id: string): Promise<SchoolCalendar | null> {
    const calendar = await prisma.schoolCalendar.findUnique({
      where: { id },
      include: calendarInclude,
    });
    return calendar ? mapCalendar(calendar as unknown as Record<string, unknown>) : null;
  }

  async findByUserAndYear(userId: string, academicYear: string): Promise<SchoolCalendar | null> {
    const calendar = await (prisma.schoolCalendar.findFirst as Function)({
      where: { userId, academicYear },
      include: calendarInclude,
    });
    return calendar ? mapCalendar(calendar as unknown as Record<string, unknown>) : null;
  }

  async findActiveMinisterial(academicYear: string): Promise<SchoolCalendar | null> {
    const calendar = await (prisma.schoolCalendar.findFirst as Function)({
      where: {
        type: 'MINISTERIAL',
        academicYear,
        isActive: true,
      },
      include: calendarInclude,
    });
    return calendar ? mapCalendar(calendar as unknown as Record<string, unknown>) : null;
  }

  async findBySchoolAndYear(schoolId: string, academicYear: string): Promise<SchoolCalendar | null> {
    const calendar = await (prisma.schoolCalendar.findFirst as Function)({
      where: {
        schoolId,
        academicYear,
        type: 'SCHOOL',
        isActive: true,
      },
      include: calendarInclude,
    });
    return calendar ? mapCalendar(calendar as unknown as Record<string, unknown>) : null;
  }

  async findByType(type: CalendarType, academicYear?: string): Promise<SchoolCalendar[]> {
    const where: Record<string, unknown> = { type };
    if (academicYear) where.academicYear = academicYear;
    const calendars = await (prisma.schoolCalendar.findMany as Function)({
      where,
      include: calendarInclude,
      orderBy: { academicYear: 'desc' },
    });
    return (calendars as Record<string, unknown>[]).map(c => mapCalendar(c));
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
    const data: Record<string, unknown> = {
      userId: input.userId,
      academicYear: input.academicYear,
      country: input.country,
      schoolName: input.schoolName,
      type: input.type ?? CalendarType.MINISTERIAL,
      schoolId: input.schoolId,
      isActive: input.isActive ?? true,
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
    };
    const calendar = await (prisma.schoolCalendar.create as Function)({
      data,
      include: calendarInclude,
    });
    return mapCalendar(calendar as unknown as Record<string, unknown>);
  }

  async update(
    id: string,
    data: Partial<Pick<SchoolCalendar, 'isActive' | 'schoolName' | 'schoolId' | 'version'>>,
  ): Promise<SchoolCalendar> {
    const calendar = await (prisma.schoolCalendar.update as Function)({
      where: { id },
      data,
      include: calendarInclude,
    });
    return mapCalendar(calendar as unknown as Record<string, unknown>);
  }

  async addEvent(
    calendarId: string,
    event: Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>,
  ): Promise<CalendarEvent> {
    const [created] = await prisma.$transaction([
      prisma.calendarEvent.create({
        data: {
          calendarId,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          type: event.type as CalendarEventType,
          allDay: event.allDay,
          ...(event.createdBy ? { createdBy: event.createdBy } : {}),
        },
      }),
      (prisma.schoolCalendar.update as Function)({
        where: { id: calendarId },
        data: { version: { increment: 1 } },
      }),
    ]);
    return created as unknown as CalendarEvent;
  }

  async removeEvent(eventId: string): Promise<void> {
    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) return;
    await prisma.$transaction([
      prisma.calendarEvent.delete({ where: { id: eventId } }),
      (prisma.schoolCalendar.update as Function)({
        where: { id: event.calendarId },
        data: { version: { increment: 1 } },
      }),
    ]);
  }

  async delete(id: string): Promise<void> {
    await prisma.schoolCalendar.delete({ where: { id } });
  }
}
