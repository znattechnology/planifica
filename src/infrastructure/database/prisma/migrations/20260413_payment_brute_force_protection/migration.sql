-- Add brute-force protection columns to payments table
ALTER TABLE "payments"
  ADD COLUMN "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blocked_until"   TIMESTAMPTZ;
