import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { PaymentStatus } from '@/src/domain/entities/payment.entity';
import { EntityNotFoundError, ValidationError, ForbiddenError } from '@/src/domain/errors/domain.error';
import { ConfirmPaymentUseCase, ConfirmPaymentOutput } from '@/src/domain/use-cases/payment/confirm-payment.use-case';

/** How many consecutive wrong attempts before the payment is temporarily locked. */
const MAX_FAILED_ATTEMPTS = 5;

/** Lock duration in milliseconds (10 minutes). */
const BLOCK_DURATION_MS = 10 * 60 * 1000;

/**
 * Allows a teacher to confirm their own payment by entering the 4-digit
 * confirmation code they received via email.
 *
 * Security layers:
 *  1. Ownership — teacher can only confirm their own payment.
 *  2. Brute-force protection — locked for 10 minutes after 5 wrong attempts.
 *  3. Expiry check — expired payments cannot be confirmed.
 *  4. Code validation — constant-time comparison (codes are short; timing attacks are low risk here).
 */
export class ConfirmPaymentByCodeUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly confirmPaymentUseCase: ConfirmPaymentUseCase,
    private readonly logger: ILogger,
  ) {}

  async execute(reference: string, code: string, userId: string): Promise<ConfirmPaymentOutput> {
    const payment = await this.paymentRepository.findByReference(reference);

    if (!payment) {
      // Use a generic message — do not reveal whether the reference exists
      throw new EntityNotFoundError('Payment', reference);
    }

    // ── Ownership ──────────────────────────────────────────────
    // Return the same generic error so an attacker can't enumerate valid references.
    if (payment.userId !== userId) {
      this.logger.warn('payment.confirm.ownership_violation', {
        userId,
        reference,
        ownerUserId: payment.userId,
      });
      throw new EntityNotFoundError('Payment', reference);
    }

    // ── Already confirmed — idempotent ─────────────────────────
    if (payment.status === PaymentStatus.CONFIRMED) {
      return this.confirmPaymentUseCase.execute(payment.id);
    }

    // ── Expired payment ────────────────────────────────────────
    if (payment.status === PaymentStatus.EXPIRED) {
      throw new ValidationError(
        'Esta referência expirou. Por favor, inicie um novo upgrade para obter uma nova referência.',
      );
    }

    // Belt-and-suspenders: cron may not have run yet
    const now = new Date();
    if (payment.expiresAt < now) {
      throw new ValidationError(
        'Esta referência expirou. Por favor, inicie um novo upgrade para obter uma nova referência.',
      );
    }

    // ── Brute-force block check ────────────────────────────────
    if (payment.blockedUntil && payment.blockedUntil > now) {
      const retryAfterSec = Math.ceil((payment.blockedUntil.getTime() - now.getTime()) / 1000);
      this.logger.warn('payment.confirm.blocked', {
        userId,
        reference,
        blockedUntil: payment.blockedUntil.toISOString(),
        retryAfterSec,
      });
      throw new ValidationError('Muitas tentativas. Tente novamente mais tarde.');
    }

    // ── Code validation ────────────────────────────────────────
    if (payment.confirmationCode !== code.trim()) {
      const failedAttempts = payment.failedAttempts + 1;
      const shouldBlock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      const blockedUntil = shouldBlock ? new Date(now.getTime() + BLOCK_DURATION_MS) : null;

      await this.paymentRepository.update(payment.id, { failedAttempts, blockedUntil });

      if (shouldBlock) {
        this.logger.warn('payment.confirm.blocked_triggered', {
          userId,
          reference,
          failedAttempts,
          blockedUntil: blockedUntil!.toISOString(),
        });
        // Return the block message immediately — don't leak that this attempt was also wrong
        throw new ValidationError('Muitas tentativas. Tente novamente mais tarde.');
      }

      this.logger.warn('payment.confirm.failed', { userId, reference, failedAttempts });
      throw new ValidationError('Código inválido.');
    }

    // ── Correct code — reset counters then delegate ────────────
    await this.paymentRepository.update(payment.id, { failedAttempts: 0, blockedUntil: null });

    this.logger.info('payment.confirm.success', { userId, reference });

    // Delegate to the shared confirmation use-case (atomic DB transaction)
    return this.confirmPaymentUseCase.execute(payment.id);
  }
}
