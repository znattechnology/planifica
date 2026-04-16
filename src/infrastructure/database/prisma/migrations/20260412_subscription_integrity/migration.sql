-- Migration: subscription_integrity
-- 1. Add CANCELLED value to SubscriptionStatus enum
-- 2. Add unique partial index to prevent duplicate active/pending subscriptions per user

-- Add CANCELLED to the SubscriptionStatus enum
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Unique partial index: a user can have at most one ACTIVE or PENDING_PAYMENT subscription.
-- CANCELLED and EXPIRED subscriptions are excluded so historical records are preserved.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_subscription
  ON "subscriptions" ("user_id")
  WHERE status IN ('ACTIVE', 'PENDING_PAYMENT');
