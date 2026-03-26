import { describe, it, expect } from 'vitest';
import { calculateEffectiveTeachingWeeks, extractWeeksFromParent } from '@/src/shared/utils/teaching-weeks';

describe('calculateEffectiveTeachingWeeks', () => {
  it('should count weeks excluding weekends', () => {
    // Sep 1 (Mon) to Sep 26 (Fri) 2025 = 4 weeks of weekdays
    const result = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-26', []);
    expect(result).toBe(4);
  });

  it('should subtract holiday weekdays', () => {
    // Sep 1 to Sep 26 2025 = 4 weeks, minus 1 week holiday (Sep 8-12)
    const result = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-26', [
      { startDate: '2025-09-08', endDate: '2025-09-12' },
    ]);
    expect(result).toBe(3);
  });

  it('should return at least 1 week', () => {
    const result = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-01', [
      { startDate: '2025-09-01', endDate: '2025-09-01' },
    ]);
    expect(result).toBe(1);
  });

  it('should handle holidays partially overlapping the period', () => {
    // Period: Sep 1-5 (1 week), holiday starts Aug 30 and ends Sep 2 (only 2 days overlap)
    const result = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-05', [
      { startDate: '2025-08-30', endDate: '2025-09-02' },
    ]);
    // 5 weekdays minus 2 (Sep 1 Mon, Sep 2 Tue) = 3 weekdays ≈ 1 week
    expect(result).toBe(1);
  });

  it('should NOT double-count overlapping holidays (CF-3)', () => {
    // Sep 1-26 = 4 weeks (20 weekdays)
    // Two overlapping events: "School Holiday Sep 8-12" and "National Holiday Sep 10"
    // Sep 10 falls inside both — must only be subtracted once
    const withOverlap = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-26', [
      { startDate: '2025-09-08', endDate: '2025-09-12' }, // 5 weekdays
      { startDate: '2025-09-10', endDate: '2025-09-10' }, // 1 weekday (already in range above)
    ]);
    const withoutOverlap = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-26', [
      { startDate: '2025-09-08', endDate: '2025-09-12' }, // 5 weekdays
    ]);
    // Both should give same result: overlapping day not double-counted
    expect(withOverlap).toBe(withoutOverlap);
    expect(withOverlap).toBe(3); // 20 - 5 = 15 weekdays = 3 weeks
  });

  it('should handle multiple overlapping holiday ranges', () => {
    // Sep 1-26 = 20 weekdays
    // Three overlapping events all covering Sep 15-19
    const result = calculateEffectiveTeachingWeeks('2025-09-01', '2025-09-26', [
      { startDate: '2025-09-15', endDate: '2025-09-19' },
      { startDate: '2025-09-15', endDate: '2025-09-17' },
      { startDate: '2025-09-18', endDate: '2025-09-19' },
    ]);
    // Only 5 unique weekdays subtracted: 20 - 5 = 15 = 3 weeks
    expect(result).toBe(3);
  });
});

describe('extractWeeksFromParent', () => {
  const weeklyPlan = [
    { week: '1ª', unit: 'I', objectives: 'Obj 1', contents: 'C1', numLessons: 2 },
    { week: '2ª', unit: 'I', objectives: 'Obj 2', contents: 'C2', numLessons: 2 },
    { week: '3ª', unit: 'II', objectives: 'Obj 3', contents: 'C3', numLessons: 2 },
    { week: '4ª', unit: 'II', objectives: 'Obj 4', contents: 'C4', numLessons: 2 },
  ];

  it('should extract 2 weeks for biweekly starting at index 0', () => {
    const result = extractWeeksFromParent(weeklyPlan, 0, 2);
    expect(result).toHaveLength(2);
    expect(result[0].week).toBe('1ª');
    expect(result[1].week).toBe('2ª');
  });

  it('should extract 1 week for lesson at index 2', () => {
    const result = extractWeeksFromParent(weeklyPlan, 2, 1);
    expect(result).toHaveLength(1);
    expect(result[0].week).toBe('3ª');
  });

  it('should clamp to available weeks at end of array', () => {
    const result = extractWeeksFromParent(weeklyPlan, 3, 2);
    expect(result).toHaveLength(1);
    expect(result[0].week).toBe('4ª');
  });

  it('should return empty array for empty weeklyPlan', () => {
    expect(extractWeeksFromParent([], 0, 2)).toEqual([]);
  });
});
