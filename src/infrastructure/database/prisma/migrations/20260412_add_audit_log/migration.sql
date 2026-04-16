-- Migration: add_audit_log
-- Creates the audit_logs table for tracking admin actions on subscriptions and payments.

CREATE TABLE "audit_logs" (
  "id"          TEXT         NOT NULL,
  "admin_id"    TEXT         NOT NULL,
  "action"      TEXT         NOT NULL,
  "entity_type" TEXT         NOT NULL,
  "entity_id"   TEXT         NOT NULL,
  "before"      JSONB        NOT NULL,
  "after"       JSONB        NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entity_id_idx"        ON "audit_logs" ("entity_id");
CREATE INDEX "audit_logs_admin_id_created_idx" ON "audit_logs" ("admin_id", "created_at");
