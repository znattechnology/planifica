import { Subscription, SubscriptionPlan, SubscriptionStatus } from '@/src/domain/entities/subscription.entity';

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription[]>;
  findAllActive(): Promise<Subscription[]>;
  findExpiredBefore(date: Date): Promise<Subscription[]>;
  create(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>;
  update(id: string, data: Partial<Pick<Subscription, 'plan' | 'status' | 'startDate' | 'endDate'>>): Promise<Subscription>;
  findAll(pagination?: { page?: number; limit?: number }): Promise<{
    data: (Subscription & { userName?: string; userEmail?: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}
