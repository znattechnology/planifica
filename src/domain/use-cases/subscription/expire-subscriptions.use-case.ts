import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { SubscriptionPlan, SubscriptionStatus, FREE_SUBSCRIPTION_END } from '@/src/domain/entities/subscription.entity';
import { PaymentStatus } from '@/src/domain/entities/payment.entity';

export interface ExpireSubscriptionsOutput {
  expiredSubscriptions: number;
  expiredPayments: number;
  renewedAsFree: number;
}

/**
 * Intended to run as a daily cron job.
 *
 * 1. Marks PENDING payments whose expiresAt has passed as EXPIRED.
 * 2. Marks ACTIVE/PENDING_PAYMENT subscriptions whose endDate has passed as EXPIRED.
 * 3. Creates a new FREE subscription for each expired subscription's user.
 */
export class ExpireSubscriptionsUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(): Promise<ExpireSubscriptionsOutput> {
    const now = new Date();

    // 1. Expire overdue PENDING payments — parallel, no ordering dependency
    const overduePayments = await this.paymentRepository.findPendingExpiredBefore(now);
    await Promise.all(
      overduePayments.map(payment =>
        this.paymentRepository.update(payment.id, { status: PaymentStatus.EXPIRED }),
      ),
    );
    const expiredPayments = overduePayments.length;

    // 2. Expire subscriptions past their endDate
    const expiredSubs = await this.subscriptionRepository.findExpiredBefore(now);
    await Promise.all(
      expiredSubs.map(sub =>
        this.subscriptionRepository.update(sub.id, { status: SubscriptionStatus.EXPIRED }),
      ),
    );
    const expiredSubscriptions = expiredSubs.length;

    // 3. Provision a fresh FREE subscription for each expired user — only if they
    //    don't already have an active one (idempotency guard against double-fire).
    const renewals = await Promise.all(
      expiredSubs.map(async sub => {
        const existing = await this.subscriptionRepository.findActiveByUserId(sub.userId);
        if (existing) return false; // Already has an active/pending subscription — skip
        await this.subscriptionRepository.create({
          userId: sub.userId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          endDate: FREE_SUBSCRIPTION_END,
        });
        return true;
      }),
    );
    const renewedAsFree = renewals.filter(Boolean).length;

    return { expiredSubscriptions, expiredPayments, renewedAsFree };
  }
}
