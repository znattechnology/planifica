/**
 * Shared calendar date utilities.
 *
 * Single source of truth for date normalization, week range generation,
 * and period parsing used across calendar-impact, plan-calendar-validation,
 * and workload-adjustment services.
 */

// ─── Core date helpers ──────────────────────────────────

/**
 * Normalize a date to UTC midnight, stripping time components.
 */
export function toUTC(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Check if a UTC date falls on a weekday (Monday–Friday).
 */
export function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

/**
 * Count weekdays (Mon–Fri) in a date range, inclusive.
 */
export function countWeekdaysInRange(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    if (isWeekday(d)) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

/**
 * Count weekday overlap between two date ranges.
 */
export function getOverlapWeekdays(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): number {
  const overlapStart = aStart > bStart ? aStart : bStart;
  const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
  if (overlapStart > overlapEnd) return 0;
  return countWeekdaysInRange(overlapStart, overlapEnd);
}

// ─── Week calculation helpers ───────────────────────────

/**
 * Get the Monday of the week containing the given date (UTC).
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toUTC(d);
}

/**
 * Generate Mon–Fri week ranges covering a term period.
 * Starts from the first Monday on or after termStart.
 * Caps the last Friday at termEnd if it overshoots.
 */
export function buildWeekRanges(
  termStart: Date,
  termEnd: Date,
): { start: Date; end: Date }[] {
  const ranges: { start: Date; end: Date }[] = [];

  let monday = getMondayOfWeek(termStart);
  if (monday < termStart) {
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }

  while (monday <= termEnd) {
    const friday = new Date(monday);
    friday.setUTCDate(monday.getUTCDate() + 4);
    const weekEnd = friday > termEnd ? termEnd : friday;

    ranges.push({ start: new Date(monday), end: weekEnd });

    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }

  return ranges;
}

// ─── Portuguese format helpers ──────────────────────────

/**
 * Parse the Portuguese period format "DD/MM A DD/MM/YYYY" into start and end Date.
 * The start year is inferred — same as end year unless start month > end month (year boundary).
 */
export function parsePeriodPT(period: string): { start: Date; end: Date } | null {
  const match = period.match(
    /^(\d{2})\/(\d{2})\s+[Aa]\s+(\d{2})\/(\d{2})\/(\d{4})$/,
  );
  if (!match) return null;

  const [, startDay, startMonth, endDay, endMonth, endYear] = match;
  const year = parseInt(endYear, 10);

  const sMonth = parseInt(startMonth, 10);
  const eMonth = parseInt(endMonth, 10);
  const startYear = sMonth > eMonth ? year - 1 : year;

  const start = new Date(Date.UTC(startYear, sMonth - 1, parseInt(startDay, 10)));
  const end = new Date(Date.UTC(year, eMonth - 1, parseInt(endDay, 10)));

  return { start, end };
}

/**
 * Format a UTC date as DD/MM (Portuguese short format).
 */
export function formatDatePT(d: Date): string {
  return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Compute the modal (most common) value from an array of numbers.
 */
export function modalValue(values: number[]): number {
  if (values.length === 0) return 0;
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      best = value;
    }
  }
  return best;
}
