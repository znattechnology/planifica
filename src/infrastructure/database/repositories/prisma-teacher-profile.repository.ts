import { prisma } from '@/src/infrastructure/database/prisma/client';
import { TeacherProfile } from '@/src/domain/entities/teacher-profile.entity';
import { ITeacherProfileRepository } from '@/src/domain/interfaces/repositories/teacher-profile.repository';

export class PrismaTeacherProfileRepository implements ITeacherProfileRepository {
  async findByUserId(userId: string): Promise<TeacherProfile | null> {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    return {
      ...profile,
      subjects: profile.subjects as string[],
      classes: profile.classes as string[],
      teachingStyle: profile.teachingStyle ?? undefined,
    };
  }

  async upsert(
    userId: string,
    data: Omit<TeacherProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<TeacherProfile> {
    const profile = await prisma.teacherProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return {
      ...profile,
      subjects: profile.subjects as string[],
      classes: profile.classes as string[],
      teachingStyle: profile.teachingStyle ?? undefined,
    };
  }
}
