import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { SubscriptionPlan, SubscriptionStatus } from '@/src/domain/entities/subscription.entity';

export interface SubscriptionUsageOutput {
  plan: SubscriptionPlan;
  plansUsed: number;
  /** null = unlimited (PREMIUM) */
  plansLimit: number | null;
  /** null = unlimited (PREMIUM) */
  remaining: number | null;
}

export class GetSubscriptionUsageUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly planConfigRepository: ISubscriptionPlanConfigRepository,
  ) {}

  async execute(userId: string): Promise<SubscriptionUsageOutput> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);

    const isPremium =
      subscription?.plan === SubscriptionPlan.PREMIUM &&
      subscription?.status === SubscriptionStatus.ACTIVE;

    // Count plans created since the start of the current calendar month.
    // Uses WAT (UTC+1) — must match SubscriptionAccessMiddleware exactly so the
    // displayed count matches what the middleware enforces.
    const nowInWAT = new Date(Date.now() + 60 * 60 * 1000);
    const startOfMonth = new Date(
      Date.UTC(nowInWAT.getUTCFullYear(), nowInWAT.getUTCMonth(), 1, 0, 0, 0, 0) - 60 * 60 * 1000,
    );

    const plansUsed = await this.planRepository.countByUserIdSince(userId, startOfMonth);

    if (isPremium) {
      return {
        plan: SubscriptionPlan.PREMIUM,
        plansUsed,
        plansLimit: null,
        remaining: null,
      };
    }

    const freeConfig = await this.planConfigRepository.findBySlug('FREE');
    const plansPerMonth = freeConfig?.plansPerMonth ?? 5;
    const plansLimit = plansPerMonth === -1 ? null : plansPerMonth;
    const remaining = plansLimit === null ? null : Math.max(0, plansLimit - plansUsed);

    return {
      plan: SubscriptionPlan.FREE,
      plansUsed,
      plansLimit,
      remaining,
    };
  }
}
