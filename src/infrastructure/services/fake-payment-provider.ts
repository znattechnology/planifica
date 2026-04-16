import { IPaymentProvider, PaymentProviderInput, PaymentProviderResult } from '@/src/domain/interfaces/services/payment-provider';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { generateReference } from '@/src/shared/utils/generate-reference';

/**
 * Generates a random 4-digit confirmation code (1000–9999).
 * The teacher enters this code in the app to activate their subscription,
 * simulating the code they would receive from Multicaixa Express after payment.
 */
function generateConfirmationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Simulates Angola's Multicaixa Express reference-based payment flow.
 * Generates a unique AO-prefixed reference, a 4-digit confirmation code,
 * and a 24-hour expiry. The confirmation code is sent to the teacher via
 * email — they must enter it in the app to complete activation.
 */
export class FakePaymentProvider implements IPaymentProvider {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async createPayment(input: PaymentProviderInput): Promise<PaymentProviderResult> {
    const MAX_ATTEMPTS = 5;
    let reference: string;
    let attempts = 0;

    do {
      reference = generateReference();
      attempts++;
      const collision = await this.paymentRepository.findByReference(reference);
      if (!collision) break;
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('Failed to generate a unique payment reference after multiple attempts');
      }
    } while (true);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + input.paymentExpiryHours);

    const confirmationCode = generateConfirmationCode();

    return { reference: reference!, amount: input.amount, expiresAt, confirmationCode };
  }
}
