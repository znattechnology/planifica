export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
}

export type PaymentSource = 'UPGRADE_BUTTON' | 'LIMIT_REACHED' | 'ADMIN';

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  reference: string;
  amount: number;
  status: PaymentStatus;
  source: PaymentSource;
  /** 4-digit code the teacher enters in-app to activate their subscription. Never exposed via API. */
  confirmationCode: string;
  /** Number of consecutive wrong code submissions for this payment. Reset to 0 on success. */
  failedAttempts: number;
  /** When set, the payment is locked from further code submissions until this timestamp. */
  blockedUntil: Date | null;
  createdAt: Date;
  expiresAt: Date;
  confirmedAt: Date | null;
}
