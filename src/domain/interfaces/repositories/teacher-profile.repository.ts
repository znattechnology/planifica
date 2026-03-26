import { TeacherProfile } from '@/src/domain/entities/teacher-profile.entity';

export interface ITeacherProfileRepository {
  findByUserId(userId: string): Promise<TeacherProfile | null>;
  upsert(userId: string, data: Omit<TeacherProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TeacherProfile>;
}
