-- Calendar versioning: add version to SchoolCalendar, calendarId to Plan

-- Add version column to school_calendars (default 1 for existing rows)
ALTER TABLE "school_calendars" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add calendar_id to plans (nullable, existing plans have no linked calendar)
ALTER TABLE "plans" ADD COLUMN "calendar_id" TEXT;

-- Index for plan-calendar lookups
CREATE INDEX "plans_calendar_id_idx" ON "plans"("calendar_id");

-- Foreign key: plans.calendar_id → school_calendars.id (SET NULL on delete)
ALTER TABLE "plans" ADD CONSTRAINT "plans_calendar_id_fkey"
  FOREIGN KEY ("calendar_id") REFERENCES "school_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
