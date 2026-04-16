-- Migration: payment_confirmation_code
-- Add confirmation_code column to payments table.
-- Existing records (already CONFIRMED or EXPIRED) receive a sentinel value;
-- only new PENDING payments will have real generated codes.

ALTER TABLE "payments" ADD COLUMN "confirmation_code" TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "payments" ALTER COLUMN "confirmation_code" DROP DEFAULT;
