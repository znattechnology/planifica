-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('NATIONAL_HOLIDAY', 'SCHOOL_HOLIDAY', 'TRIMESTER_BREAK', 'EXAM_PERIOD', 'MAKEUP_EXAM', 'PEDAGOGICAL_ACTIVITY', 'SCHOOL_EVENT', 'CUSTOM');

-- CreateTable
CREATE TABLE "school_calendars" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Angola',
    "school_name" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_terms" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trimester" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "teaching_weeks" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_calendars_user_id_academic_year_key" ON "school_calendars"("user_id", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_terms_calendar_id_trimester_key" ON "calendar_terms"("calendar_id", "trimester");

-- CreateIndex
CREATE INDEX "calendar_events_calendar_id_type_idx" ON "calendar_events"("calendar_id", "type");

-- CreateIndex
CREATE INDEX "calendar_events_calendar_id_start_date_idx" ON "calendar_events"("calendar_id", "start_date");

-- AddForeignKey
ALTER TABLE "school_calendars" ADD CONSTRAINT "school_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_terms" ADD CONSTRAINT "calendar_terms_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "school_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "school_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
