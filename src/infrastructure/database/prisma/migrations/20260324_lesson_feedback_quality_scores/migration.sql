-- Add lesson feedback columns
ALTER TABLE "lessons" ADD COLUMN "teacher_notes" TEXT;
ALTER TABLE "lessons" ADD COLUMN "actual_duration" INTEGER;
ALTER TABLE "lessons" ADD COLUMN "completed_at" TIMESTAMP(3);

-- Add new lesson statuses
ALTER TYPE "LessonStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_COMPLETED';
ALTER TYPE "LessonStatus" ADD VALUE IF NOT EXISTS 'NOT_COMPLETED';

-- Add quality scores to plans
ALTER TABLE "plans" ADD COLUMN "quality_scores" JSONB;

-- Add indexes for lesson feedback queries
CREATE INDEX IF NOT EXISTS "lessons_plan_id_status_idx" ON "lessons"("plan_id", "status");
CREATE INDEX IF NOT EXISTS "lessons_user_id_status_idx" ON "lessons"("user_id", "status");
