-- CreateEnum
CREATE TYPE "CalendarType" AS ENUM ('MINISTERIAL', 'SCHOOL');

-- AlterTable: Add multi-calendar fields to school_calendars
ALTER TABLE "school_calendars" ADD COLUMN "type" "CalendarType" NOT NULL DEFAULT 'MINISTERIAL';
ALTER TABLE "school_calendars" ADD COLUMN "school_id" TEXT;
ALTER TABLE "school_calendars" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add selected_calendar_id to users
ALTER TABLE "users" ADD COLUMN "selected_calendar_id" TEXT;

-- CreateIndex
CREATE INDEX "school_calendars_type_academic_year_is_active_idx" ON "school_calendars"("type", "academic_year", "is_active");
CREATE INDEX "school_calendars_school_id_academic_year_idx" ON "school_calendars"("school_id", "academic_year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_selected_calendar_id_fkey" FOREIGN KEY ("selected_calendar_id") REFERENCES "school_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
