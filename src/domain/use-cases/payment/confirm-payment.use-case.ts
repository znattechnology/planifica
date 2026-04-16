import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IAuditLogRepository } from '@/src/domain/interfaces/repositories/audit-log.repository';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { PaymentStatus, PaymentSource } from '@/src/domain/entities/payment.entity';
import { SubscriptionPlan, SubscriptionStatus } from '@/src/domain/entities/subscription.entity';
import { EntityNotFoundError, ValidationError } from '@/src/domain/errors/domain.error';
import { Payment } from '@/src/domain/entities/payment.entity';
import { Subscription } from '@/src/domain/entities/subscription.entity';
// NOTE: Direct prisma import for atomicity — payment + subscription activation must be a single DB transaction.
import { prisma } from '@/src/infrastructure/database/prisma/client';

export interface ConfirmPaymentOutput {
  payment: Payment;
  subscription: Subscription;
}

export class ConfirmPaymentUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly auditLogRepository?: IAuditLogRepository,
    private readonly planConfigRepository?: ISubscriptionPlanConfigRepository,
  ) {}

  async execute(paymentId: string, adminId?: string): Promise<ConfirmPaymentOutput> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new EntityNotFoundError('Payment', paymentId);
    }

    // Idempotent — already confirmed: return current state without side-effects
    if (payment.status === PaymentStatus.CONFIRMED) {
      const subscription = await this.subscriptionRepository.findById(payment.subscriptionId);
      if (!subscription) throw new EntityNotFoundError('Subscription', payment.subscriptionId);
      return { payment, subscription };
    }

    if (payment.status === PaymentStatus.EXPIRED) {
      throw new ValidationError('Este pagamento expirou e não pode ser confirmado');
    }

    // ── Integrity checks ────────────────────────────────────────
    const subscription = await this.subscriptionRepository.findById(payment.subscriptionId);
    if (!subscription) {
      throw new EntityNotFoundError('Subscription', payment.subscriptionId);
    }
    // Ensure payment and subscription belong to the same user (guards against
    // cross-user manipulation via crafted paymentId)
    if (subscription.userId !== payment.userId) {
      throw new ValidationError('Pagamento não pertence à subscrição indicada');
    }

    const now = new Date();
    const endDate = new Date(now);
    const premiumConfig = await this.planConfigRepository?.findBySlug('PREMIUM');
    const durationDays = premiumConfig?.durationDays ?? 30;
    endDate.setDate(endDate.getDate() + durationDays);

    // Capture state before mutation for audit trail
    const paymentBefore = { id: payment.id, status: payment.status };
    const subscriptionBefore = { id: subscription.id, status: subscription.status, plan: subscription.plan };

    // Atomic: both writes succeed or both fail — prevents a confirmed payment
    // with a still-inactive subscription (or vice versa).
    const [rawPayment, rawSub] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: now },
      }),
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE, startDate: now, endDate },
      }),
    ]);

    const confirmedPayment: Payment = {
      id: rawPayment.id,
      userId: rawPayment.userId,
      subscriptionId: rawPayment.subscriptionId,
      reference: rawPayment.reference,
      amount: rawPayment.amount,
      status: rawPayment.status as PaymentStatus,
      source: rawPayment.source as PaymentSource,
      confirmationCode: rawPayment.confirmationCode,
      failedAttempts: rawPayment.failedAttempts,
      blockedUntil: rawPayment.blockedUntil,
      createdAt: rawPayment.createdAt,
      expiresAt: rawPayment.expiresAt,
      confirmedAt: rawPayment.confirmedAt,
    };

    const activatedSubscription: Subscription = {
      id: rawSub.id,
      userId: rawSub.userId,
      plan: rawSub.plan as SubscriptionPlan,
      status: rawSub.status as SubscriptionStatus,
      startDate: rawSub.startDate,
      endDate: rawSub.endDate,
      createdAt: rawSub.createdAt,
      updatedAt: rawSub.updatedAt,
    };

    // Persist audit trail (non-blocking — never fail the primary operation)
    if (this.auditLogRepository && adminId) {
      this.auditLogRepository
        .create({
          adminId,
          action: 'CONFIRM_PAYMENT',
          entityType: 'PAYMENT',
          entityId: payment.id,
          before: { ...paymentBefore, subscription: subscriptionBefore },
          after: {
            id: confirmedPayment.id,
            status: confirmedPayment.status,
            confirmedAt: confirmedPayment.confirmedAt?.toISOString(),
            subscription: { id: activatedSubscription.id, status: activatedSubscription.status },
          },
        })
        .catch(() => {
          // Audit log failure must never propagate — the payment is already confirmed
        });
    }

    return { payment: confirmedPayment, subscription: activatedSubscription };
  }
}
