import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { Lesson, LessonStatus } from '@/src/domain/entities/lesson.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

const COMPLETED_STATUSES = [
  LessonStatus.DELIVERED,
  LessonStatus.PARTIALLY_COMPLETED,
  LessonStatus.NOT_COMPLETED,
];

export class PrismaLessonRepository implements ILessonRepository {
  async findById(id: string): Promise<Lesson | null> {
    const record = await prisma.lesson.findUnique({ where: { id } });
    return record as unknown as Lesson | null;
  }

  async findByPlanId(planId: string): Promise<Lesson[]> {
    const records = await prisma.lesson.findMany({
      where: { planId },
      orderBy: { date: 'asc' },
    });
    return records as unknown as Lesson[];
  }

  async findByUserId(userId: string): Promise<Lesson[]> {
    const records = await prisma.lesson.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return records as unknown as Lesson[];
  }

  async findByUserAndSubject(userId: string, subject: string): Promise<Lesson[]> {
    const records = await prisma.lesson.findMany({
      where: {
        userId,
        plan: { subject },
      },
      orderBy: { date: 'desc' },
      include: { plan: { select: { subject: true } } },
    });
    return records as unknown as Lesson[];
  }

  async findCompletedByUser(userId: string, subject?: string): Promise<Lesson[]> {
    const where: Record<string, unknown> = {
      userId,
      status: { in: COMPLETED_STATUSES },
    };
    if (subject) {
      where.plan = { subject };
    }
    const records = await prisma.lesson.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { plan: { select: { subject: true, grade: true } } },
    });
    return records as unknown as Lesson[];
  }

  async create(data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    const record = await prisma.lesson.create({ data: data as never });
    return record as unknown as Lesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const record = await prisma.lesson.update({
      where: { id },
      data: data as never,
    });
    return record as unknown as Lesson;
  }

  async delete(id: string): Promise<void> {
    await prisma.lesson.delete({ where: { id } });
  }
}
