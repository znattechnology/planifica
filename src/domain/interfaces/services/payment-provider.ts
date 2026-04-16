export interface PaymentProviderResult {
  reference: string;
  amount: number;
  expiresAt: Date;
  /** 4-digit confirmation code the teacher will enter to activate their subscription. */
  confirmationCode: string;
}

export interface PaymentProviderInput {
  userId: string;
  amount: number;
  /** Hours until the payment reference expires. Read from the plan config. */
  paymentExpiryHours: number;
}

/**
 * Abstraction over payment creation backends.
 * Currently implemented by FakePaymentProvider (simulated Multicaixa Express).
 * Replace with a real provider (e.g. Multicaixa, PayPal) without touching use-case logic.
 */
export interface IPaymentProvider {
  createPayment(input: PaymentProviderInput): Promise<PaymentProviderResult>;
}
