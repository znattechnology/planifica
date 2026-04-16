import { prisma } from '@/src/infrastructure/database/prisma/client';
import { CalendarEventTypeConfig } from '@/src/domain/entities/calendar-event-type-config.entity';
import { ICalendarEventTypeConfigRepository } from '@/src/domain/interfaces/repositories/calendar-event-type-config.repository';

export class PrismaCalendarEventTypeConfigRepository implements ICalendarEventTypeConfigRepository {
  async findAll(): Promise<CalendarEventTypeConfig[]> {
    const configs = await prisma.calendarEventTypeConfig.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return configs as unknown as CalendarEventTypeConfig[];
  }

  async findBySchool(schoolId: string): Promise<CalendarEventTypeConfig[]> {
    const configs = await prisma.calendarEventTypeConfig.findMany({
      where: {
        OR: [
          { isSystem: true },
          { schoolId },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return configs as unknown as CalendarEventTypeConfig[];
  }

  async findSystemTypes(): Promise<CalendarEventTypeConfig[]> {
    const configs = await prisma.calendarEventTypeConfig.findMany({
      where: { isSystem: true },
      orderBy: { name: 'asc' },
    });
    return configs as unknown as CalendarEventTypeConfig[];
  }

  async findById(id: string): Promise<CalendarEventTypeConfig | null> {
    const config = await prisma.calendarEventTypeConfig.findUnique({
      where: { id },
    });
    return config as unknown as CalendarEventTypeConfig | null;
  }

  async create(input: Omit<CalendarEventTypeConfig, 'id' | 'createdAt'>): Promise<CalendarEventTypeConfig> {
    const config = await prisma.calendarEventTypeConfig.create({
      data: {
        name: input.name,
        label: input.label,
        color: input.color,
        schoolId: input.schoolId,
        isSystem: input.isSystem,
      },
    });
    return config as unknown as CalendarEventTypeConfig;
  }

  async delete(id: string): Promise<void> {
    await prisma.calendarEventTypeConfig.delete({ where: { id } });
  }
}
