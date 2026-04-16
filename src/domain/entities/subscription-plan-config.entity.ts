export interface SubscriptionPlanConfig {
  id: string;
  /** Matches SubscriptionPlan enum values: "FREE" | "PREMIUM" (or any future slug). */
  slug: string;
  name: string;
  priceKz: number;
  durationDays: number;
  /** Number of plans allowed per month. -1 means unlimited. */
  plansPerMonth: number;
  /** Hours before a pending payment reference expires. */
  paymentExpiryHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
