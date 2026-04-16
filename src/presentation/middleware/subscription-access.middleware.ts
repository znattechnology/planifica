import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { SubscriptionPlan, SubscriptionStatus } from '@/src/domain/entities/subscription.entity';
import { SubscriptionLimitError, ForbiddenError } from '@/src/domain/errors/domain.error';

export type SubscriptionAction = 'generate_plan' | 'export';

/**
 * Checks whether a user's active subscription permits the requested action.
 *
 * FREE limitations enforced here:
 *   - generate_plan: max FREE_PLANS_PER_MONTH plans per calendar month
 *   - export:        always denied for FREE subscribers
 *
 * Throws SubscriptionLimitError or ForbiddenError when access is denied,
 * so callers can wrap in try/catch or let handleApiError map it to 403.
 */
export class SubscriptionAccessMiddleware {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly planConfigRepository: ISubscriptionPlanConfigRepository,
  ) {}

  async check(userId: string, action: SubscriptionAction): Promise<void> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);

    const isPremium =
      subscription?.plan === SubscriptionPlan.PREMIUM &&
      subscription?.status === SubscriptionStatus.ACTIVE;

    if (isPremium) {
      return; // PREMIUM — no restrictions
    }

    // ── FREE or no active subscription ──────────────────────────

    if (action === 'export') {
      throw new ForbiddenError(
        'A funcionalidade de exportação requer uma subscrição PREMIUM. Faça upgrade para continuar.',
      );
    }

    if (action === 'generate_plan') {
      // WAT = UTC+1: compute the start of the current month in UTC+1,
      // then convert back to UTC so the DB comparison is correct.
      const nowInWAT = new Date(Date.now() + 60 * 60 * 1000); // shift to UTC+1
      const startOfMonth = new Date(
        Date.UTC(nowInWAT.getUTCFullYear(), nowInWAT.getUTCMonth(), 1, 0, 0, 0, 0) - 60 * 60 * 1000,
      ); // first moment of the month in WAT, expressed in UTC

      const plansThisMonth = await this.planRepository.countByUserIdSince(userId, startOfMonth);

      const freeConfig = await this.planConfigRepository.findBySlug('FREE');
      const plansPerMonth = freeConfig?.plansPerMonth ?? 5;

      // -1 means unlimited — no restriction
      if (plansPerMonth !== -1 && plansThisMonth >= plansPerMonth) {
        throw new SubscriptionLimitError(
          `O plano FREE permite ${plansPerMonth} planos por mês. ` +
            `Já gerou ${plansThisMonth} este mês. Faça upgrade para PREMIUM para continuar.`,
        );
      }
    }
  }
}
