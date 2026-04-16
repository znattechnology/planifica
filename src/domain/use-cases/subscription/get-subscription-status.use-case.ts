import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { Subscription, SubscriptionPlan } from '@/src/domain/entities/subscription.entity';
import { Payment, PaymentStatus } from '@/src/domain/entities/payment.entity';

/** Safe payment data for the frontend — confirmationCode is deliberately excluded. */
export type PendingPaymentSummary = Omit<Payment, 'confirmationCode'>;

export interface SubscriptionStatusOutput {
  subscription: Subscription | null;
  pendingPayment: PendingPaymentSummary | null;
  /**
   * Days until the subscription expires. 0 when already expired.
   * null when FREE (no expiry) or no subscription exists.
   */
  daysRemaining: number | null;
}

export class GetSubscriptionStatusUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(userId: string): Promise<SubscriptionStatusOutput> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);

    let pendingPayment: PendingPaymentSummary | null = null;
    if (subscription) {
      const payments = await this.paymentRepository.findBySubscriptionId(subscription.id);
      const raw = payments.find(p => p.status === PaymentStatus.PENDING) ?? null;
      if (raw) {
        // Strip confirmationCode — must never leave the server via this endpoint
        const { confirmationCode: _, ...summary } = raw;
        pendingPayment = summary;
      }
    }

    // FREE subscriptions never expire (endDate = 2099-12-31 sentinel) — return null
    const isFree = subscription?.plan === SubscriptionPlan.FREE;
    const daysRemaining =
      subscription && !isFree
        ? Math.max(0, Math.ceil((subscription.endDate.getTime() - Date.now()) / 86_400_000))
        : null;

    return { subscription, pendingPayment, daysRemaining };
  }
}
