export enum SubscriptionPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CANCELLED = 'CANCELLED',
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Duration of a PREMIUM subscription after payment confirmation. */
export const SUBSCRIPTION_DURATION_DAYS = 30;
export const FREE_PLANS_PER_MONTH = 5;
export const PREMIUM_AMOUNT_KZ = 5000;
export const PAYMENT_EXPIRY_HOURS = 24;

/**
 * Sentinel end-date for FREE subscriptions.
 * FREE plans never expire — this far-future date prevents the cron from
 * treating them as expired PREMIUM subscriptions.
 */
export const FREE_SUBSCRIPTION_END = new Date('2099-12-31T23:59:59.000Z');
