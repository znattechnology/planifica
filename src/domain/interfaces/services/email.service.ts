export interface PaymentEmailData {
  reference: string;
  amount: number;
  expiresAt: Date;
  /** Confirmation code the teacher must enter in the app to activate their subscription. */
  confirmationCode: string;
}

export interface IEmailService {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendVerificationCodeEmail(to: string, code: string, name: string): Promise<void>;
  sendPasswordChangeCodeEmail(to: string, code: string, name: string): Promise<void>;
  sendPaymentReferenceEmail(to: string, name: string, data: PaymentEmailData): Promise<void>;
}
