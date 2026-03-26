import { TeachingActivity } from '@/src/domain/entities/teaching-activity.entity';

export interface ITeachingActivityRepository {
  findById(id: string): Promise<TeachingActivity | null>;
  findByUserId(userId: string): Promise<TeachingActivity[]>;
  findByPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TeachingActivity[]>;
  findBySubjectAndPeriod(
    userId: string,
    subject: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TeachingActivity[]>;
  create(data: Omit<TeachingActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeachingActivity>;
  createMany(data: Omit<TeachingActivity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
  update(id: string, data: Partial<TeachingActivity>): Promise<TeachingActivity>;
  delete(id: string): Promise<void>;
}
