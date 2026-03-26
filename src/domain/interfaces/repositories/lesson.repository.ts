import { Lesson, LessonStatus } from '@/src/domain/entities/lesson.entity';

export interface LessonFeedbackData {
  status: LessonStatus;
  teacherNotes?: string;
  actualDuration?: number;
}

export interface ILessonRepository {
  findById(id: string): Promise<Lesson | null>;
  findByPlanId(planId: string): Promise<Lesson[]>;
  findByUserId(userId: string): Promise<Lesson[]>;
  findByUserAndSubject(userId: string, subject: string): Promise<Lesson[]>;
  findCompletedByUser(userId: string, subject?: string): Promise<Lesson[]>;
  create(data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson>;
  update(id: string, data: Partial<Lesson>): Promise<Lesson>;
  delete(id: string): Promise<void>;
}
