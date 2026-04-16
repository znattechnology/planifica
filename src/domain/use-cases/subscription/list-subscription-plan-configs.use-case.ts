import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { SubscriptionPlanConfig } from '@/src/domain/entities/subscription-plan-config.entity';

export class ListSubscriptionPlanConfigsUseCase {
  constructor(private readonly repository: ISubscriptionPlanConfigRepository) {}

  async execute(): Promise<SubscriptionPlanConfig[]> {
    return this.repository.findAll();
  }
}
