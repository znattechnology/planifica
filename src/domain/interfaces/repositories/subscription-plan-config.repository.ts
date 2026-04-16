import { SubscriptionPlanConfig } from '@/src/domain/entities/subscription-plan-config.entity';

export interface ISubscriptionPlanConfigRepository {
  findAll(): Promise<SubscriptionPlanConfig[]>;
  findBySlug(slug: string): Promise<SubscriptionPlanConfig | null>;
  findById(id: string): Promise<SubscriptionPlanConfig | null>;
  create(data: Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlanConfig>;
  update(
    id: string,
    data: Partial<Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<SubscriptionPlanConfig>;
}
