import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IPaymentProvider } from '@/src/domain/interfaces/services/payment-provider';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/src/domain/entities/subscription.entity';
import { Payment, PaymentSource, PaymentStatus } from '@/src/domain/entities/payment.entity';
import { ValidationError, EntityNotFoundError } from '@/src/domain/errors/domain.error';

/** Payment data safe to expose to the frontend — confirmationCode is deliberately excluded. */
export type PaymentSummary = Omit<Payment, 'confirmationCode'>;

export interface UpgradeToPremiumOutput {
  subscription: Subscription;
  payment: PaymentSummary;
}

export class UpgradeToPremiumUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService,
    private readonly paymentProvider: IPaymentProvider,
    private readonly planConfigRepository: ISubscriptionPlanConfigRepository,
  ) {}

  async execute(userId: string, source: PaymentSource = 'UPGRADE_BUTTON'): Promise<UpgradeToPremiumOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    const premiumConfig = await this.planConfigRepository.findBySlug('PREMIUM');
    if (!premiumConfig || !premiumConfig.isActive) {
      throw new ValidationError('O plano PREMIUM não está disponível de momento');
    }

    const existingSub = await this.subscriptionRepository.findActiveByUserId(userId);

    // ── Already PREMIUM active — nothing to do ──────────────────
    if (existingSub?.plan === SubscriptionPlan.PREMIUM && existingSub.status === SubscriptionStatus.ACTIVE) {
      throw new ValidationError('Já possui uma subscrição PREMIUM activa');
    }

    // ── PENDING_PAYMENT: reuse existing subscription + payment (idempotent) ──
    if (existingSub?.status === SubscriptionStatus.PENDING_PAYMENT) {
      const payments = await this.paymentRepository.findBySubscriptionId(existingSub.id);
      const pendingPayment = payments.find(p => p.status === PaymentStatus.PENDING) ?? null;

      if (pendingPayment) {
        // Return the in-flight reference — confirmationCode stays server-side only
        const { confirmationCode: _, ...paymentSummary } = pendingPayment;
        return { subscription: existingSub, payment: paymentSummary };
      }
      // The pending payment expired but subscription is still PENDING_PAYMENT:
      // fall through and create a fresh payment for this subscription.
    }

    // ── Expire current FREE/stale ACTIVE subscription before creating PREMIUM ──
    if (existingSub?.status === SubscriptionStatus.ACTIVE) {
      await this.subscriptionRepository.update(existingSub.id, { status: SubscriptionStatus.EXPIRED });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + premiumConfig.durationDays);

    // Reuse the existing PENDING_PAYMENT subscription (expired-payment edge-case) or create new.
    // Wrap creation in try/catch for race conditions: two concurrent requests can both pass the
    // findActiveByUserId check, then one will hit the partial unique index (P2002). On collision,
    // re-fetch the subscription that won the race and return it idempotently.
    let subscription: Subscription;
    if (existingSub?.status === SubscriptionStatus.PENDING_PAYMENT) {
      subscription = existingSub;
    } else {
      try {
        subscription = await this.subscriptionRepository.create({
          userId,
          plan: SubscriptionPlan.PREMIUM,
          status: SubscriptionStatus.PENDING_PAYMENT,
          startDate: now,
          endDate,
        });
      } catch (err) {
        const isUniqueViolation = typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2002';
        if (!isUniqueViolation) throw err;

        // Another concurrent request already created the subscription — re-fetch and return it
        const racedSub = await this.subscriptionRepository.findActiveByUserId(userId);
        if (!racedSub) throw err; // unexpected: index fired but sub not found
        const racedPayments = await this.paymentRepository.findBySubscriptionId(racedSub.id);
        const racedPending = racedPayments.find(p => p.status === PaymentStatus.PENDING);
        if (racedPending) {
          const { confirmationCode: _, ...racedPaymentSummary } = racedPending;
          return { subscription: racedSub, payment: racedPaymentSummary };
        }
        subscription = racedSub;
      }
    }

    // Delegate reference + expiry + confirmation code generation to the payment provider
    const providerResult = await this.paymentProvider.createPayment({
      userId,
      amount: premiumConfig.priceKz,
      paymentExpiryHours: premiumConfig.paymentExpiryHours,
    });

    const payment = await this.paymentRepository.create({
      userId,
      subscriptionId: subscription.id,
      reference: providerResult.reference,
      amount: providerResult.amount,
      status: PaymentStatus.PENDING,
      source,
      confirmationCode: providerResult.confirmationCode,
      failedAttempts: 0,
      blockedUntil: null,
      expiresAt: providerResult.expiresAt,
      confirmedAt: null,
    });

    // Send confirmation code via email (non-blocking — email failure must not abort upgrade)
    this.emailService
      .sendPaymentReferenceEmail(user.email, user.name, {
        reference: payment.reference,
        amount: payment.amount,
        expiresAt: payment.expiresAt,
        confirmationCode: payment.confirmationCode,
      })
      .catch(() => {});

    // Strip confirmationCode before returning — must never leave the server via this endpoint
    const { confirmationCode: _, ...paymentSummary } = payment;
    return { subscription, payment: paymentSummary };
  }
}
