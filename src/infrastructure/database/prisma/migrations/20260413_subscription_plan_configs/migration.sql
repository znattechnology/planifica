-- Migration: subscription_plan_configs
-- Creates the subscription_plan_configs table and seeds the two initial plans
-- with values matching the previous hardcoded constants.

CREATE TABLE "subscription_plan_configs" (
  "id"                   TEXT NOT NULL,
  "slug"                 TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "price_kz"             DOUBLE PRECISION NOT NULL,
  "duration_days"        INTEGER NOT NULL,
  "plans_per_month"      INTEGER NOT NULL,
  "payment_expiry_hours" INTEGER NOT NULL,
  "is_active"            BOOLEAN NOT NULL DEFAULT true,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plan_configs_slug_key"
  ON "subscription_plan_configs"("slug");

-- Seed initial plans (values match previous hardcoded constants)
INSERT INTO "subscription_plan_configs"
  ("id","slug","name","price_kz","duration_days","plans_per_month","payment_expiry_hours","is_active","created_at","updated_at")
VALUES
  (gen_random_uuid(), 'FREE',    'Plano Gratuito', 0,    36524, 5,  0,  true, NOW(), NOW()),
  (gen_random_uuid(), 'PREMIUM', 'Plano Premium',  5000, 30,    -1, 24, true, NOW(), NOW());
