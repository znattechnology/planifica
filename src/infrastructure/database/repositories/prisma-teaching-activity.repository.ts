import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { TeachingActivity } from '@/src/domain/entities/teaching-activity.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

export class PrismaTeachingActivityRepository implements ITeachingActivityRepository {
  async findById(id: string): Promise<TeachingActivity | null> {
    const activity = await prisma.teachingActivity.findUnique({ where: { id } });
    return this.toDomain(activity);
  }

  async findByUserId(userId: string): Promise<TeachingActivity[]> {
    const activities = await prisma.teachingActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return activities.map((a: unknown) => this.toDomain(a)!);
  }

  async findByPeriod(userId: string, startDate: Date, endDate: Date): Promise<TeachingActivity[]> {
    const activities = await prisma.teachingActivity.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
    return activities.map((a: unknown) => this.toDomain(a)!);
  }

  async findBySubjectAndPeriod(
    userId: string,
    subject: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TeachingActivity[]> {
    const activities = await prisma.teachingActivity.findMany({
      where: {
        userId,
        subject,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
    return activities.map((a: unknown) => this.toDomain(a)!);
  }

  async create(data: Omit<TeachingActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeachingActivity> {
    const activity = await prisma.teachingActivity.create({
      data: {
        ...data,
        outcomes: data.outcomes as string[] | undefined,
        challenges: data.challenges as string[] | undefined,
      } as never,
    });
    return this.toDomain(activity)!;
  }

  async createMany(data: Omit<TeachingActivity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    const result = await prisma.teachingActivity.createMany({
      data: data.map((d) => ({
        ...d,
        outcomes: d.outcomes as string[] | undefined,
        challenges: d.challenges as string[] | undefined,
      })) as never,
    });
    return result.count;
  }

  async update(id: string, data: Partial<TeachingActivity>): Promise<TeachingActivity> {
    const activity = await prisma.teachingActivity.update({
      where: { id },
      data: data as never,
    });
    return this.toDomain(activity)!;
  }

  async delete(id: string): Promise<void> {
    await prisma.teachingActivity.delete({ where: { id } });
  }

  private toDomain(raw: unknown): TeachingActivity | null {
    if (!raw) return null;
    const r = raw as Record<string, unknown>;
    return {
      ...r,
      outcomes: (r.outcomes as string[]) || [],
      challenges: (r.challenges as string[]) || [],
    } as TeachingActivity;
  }
}
