-- Add unique constraint: only one calendar per (type, schoolId, academicYear)
CREATE UNIQUE INDEX "school_calendars_type_school_id_academic_year_key"
  ON "school_calendars"("type", "school_id", "academic_year");

-- Add optional color override to calendar events
ALTER TABLE "calendar_events" ADD COLUMN "color" TEXT;
