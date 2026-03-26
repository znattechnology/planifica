-- AlterTable: Add trimester and week_index columns to plans table
ALTER TABLE "plans" ADD COLUMN "trimester" INTEGER;
ALTER TABLE "plans" ADD COLUMN "week_index" INTEGER;
