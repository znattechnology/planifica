/**
 * Calculates the effective number of teaching weeks in a period,
 * excluding holidays and non-teaching events.
 */
export function calculateEffectiveTeachingWeeks(
  startDate: string,
  endDate: string,
  holidays: { startDate: string; endDate: string }[],
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Count total weekdays in the period
  let totalWeekdays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) totalWeekdays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  // Subtract weekdays that fall on holidays (deduplicate overlapping events)
  const countedHolidayDates = new Set<string>();
  let holidayWeekdays = 0;
  for (const h of holidays) {
    const hStart = new Date(h.startDate);
    const hEnd = new Date(h.endDate);
    // Clamp to period boundaries
    const effectiveStart = hStart < start ? start : hStart;
    const effectiveEnd = hEnd > end ? end : hEnd;
    if (effectiveStart > effectiveEnd) continue;

    const hCursor = new Date(effectiveStart);
    while (hCursor <= effectiveEnd) {
      const dateKey = hCursor.toISOString().split('T')[0];
      if (!countedHolidayDates.has(dateKey)) {
        const day = hCursor.getDay();
        if (day !== 0 && day !== 6) {
          holidayWeekdays++;
          countedHolidayDates.add(dateKey);
        }
      }
      hCursor.setDate(hCursor.getDate() + 1);
    }
  }

  const effectiveWeekdays = totalWeekdays - holidayWeekdays;
  return Math.max(1, Math.round(effectiveWeekdays / 5));
}

/**
 * Extracts specific week(s) from a parent plan's weeklyPlan array.
 * weekIndex is 0-based.
 * For biweekly plans, extracts 2 consecutive weeks.
 * For lesson plans, extracts 1 week.
 */
export function extractWeeksFromParent(
  weeklyPlan: { week: string; period?: string; unit: string; objectives: string; contents: string; numLessons: number }[],
  weekIndex: number,
  count: number = 1,
): typeof weeklyPlan {
  if (!weeklyPlan || weeklyPlan.length === 0) return [];
  const startIdx = Math.max(0, Math.min(weekIndex, weeklyPlan.length - 1));
  const endIdx = Math.min(startIdx + count, weeklyPlan.length);
  return weeklyPlan.slice(startIdx, endIdx);
}
