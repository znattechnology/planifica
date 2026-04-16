import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { PaymentStatus } from '@/src/domain/entities/payment.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';

export interface PaymentStatusOutput {
  reference: string;
  status: PaymentStatus;
  amount: number;
  expiresAt: Date;
  confirmedAt: Date | null;
}

/**
 * Returns the current status of a payment by its reference string.
 * Used by the frontend to poll for payment confirmation without exposing internal IDs.
 * Requires the requesting user to own the payment (ownership enforced here, not in the controller).
 */
export class GetPaymentStatusByReferenceUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(reference: string, userId: string): Promise<PaymentStatusOutput> {
    const payment = await this.paymentRepository.findByReference(reference);

    // Use a generic not-found error for both missing and wrong-owner cases
    // so the caller cannot enumerate valid references belonging to other users.
    if (!payment || payment.userId !== userId) {
      throw new EntityNotFoundError('Payment', reference);
    }

    return {
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
      confirmedAt: payment.confirmedAt,
    };
  }
}
