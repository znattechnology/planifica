import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { Subscription, SubscriptionPlan, SubscriptionStatus, FREE_SUBSCRIPTION_END } from '@/src/domain/entities/subscription.entity';

export class CreateFreeSubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<Subscription> {
    const now = new Date();

    return this.subscriptionRepository.create({
      userId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      endDate: FREE_SUBSCRIPTION_END,
    });
  }
}
