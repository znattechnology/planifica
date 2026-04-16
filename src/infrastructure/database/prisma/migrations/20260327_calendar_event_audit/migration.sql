ALTER TABLE "calendar_events" ADD COLUMN "created_by" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "updated_by" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "updated_at" TIMESTAMP(3);
