-- Migration: audit_log_metadata
-- Add optional metadata column to audit_logs for IP and user-agent capture.

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
