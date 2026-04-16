-- AlterTable: Add calendar version tracking and snapshot to plans
ALTER TABLE "plans" ADD COLUMN "calendar_version" INTEGER;
ALTER TABLE "plans" ADD COLUMN "calendar_snapshot" JSONB;
