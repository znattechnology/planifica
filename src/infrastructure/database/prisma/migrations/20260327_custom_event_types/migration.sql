-- CreateTable
CREATE TABLE "calendar_event_type_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "school_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_type_configs_name_school_id_key" ON "calendar_event_type_configs"("name", "school_id");

-- Add typeConfigId to CalendarEvent
ALTER TABLE "calendar_events" ADD COLUMN "type_config_id" TEXT;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_type_config_id_fkey" FOREIGN KEY ("type_config_id") REFERENCES "calendar_event_type_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed system event types
INSERT INTO "calendar_event_type_configs" ("id", "name", "label", "color", "is_system") VALUES
  ('sys_national_holiday', 'NATIONAL_HOLIDAY', 'Feriado Nacional', '#EF4444', true),
  ('sys_school_holiday', 'SCHOOL_HOLIDAY', 'Feriado Escolar', '#F97316', true),
  ('sys_trimester_break', 'TRIMESTER_BREAK', 'Férias', '#3B82F6', true),
  ('sys_exam_period', 'EXAM_PERIOD', 'Período de Provas', '#8B5CF6', true),
  ('sys_makeup_exam', 'MAKEUP_EXAM', 'Exame de Recurso', '#F59E0B', true),
  ('sys_pedagogical_activity', 'PEDAGOGICAL_ACTIVITY', 'Jornada Pedagógica', '#06B6D4', true),
  ('sys_school_event', 'SCHOOL_EVENT', 'Evento Escolar', '#10B981', true),
  ('sys_custom', 'CUSTOM', 'Personalizado', '#6B7280', true);
