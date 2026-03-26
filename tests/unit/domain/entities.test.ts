import { describe, it, expect } from 'vitest';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import { UserRole } from '@/src/domain/entities/user.entity';
import { ActivityType } from '@/src/domain/entities/teaching-activity.entity';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';

describe('Plan Entity Enums', () => {
  it('PlanType should have 4 types', () => {
    expect(Object.values(PlanType)).toHaveLength(4);
    expect(PlanType.ANNUAL).toBe('ANNUAL');
    expect(PlanType.TRIMESTER).toBe('TRIMESTER');
    expect(PlanType.BIWEEKLY).toBe('BIWEEKLY');
    expect(PlanType.LESSON).toBe('LESSON');
  });

  it('PlanStatus should have 5 statuses', () => {
    expect(Object.values(PlanStatus)).toHaveLength(5);
    expect(PlanStatus.DRAFT).toBe('DRAFT');
    expect(PlanStatus.GENERATING).toBe('GENERATING');
    expect(PlanStatus.GENERATED).toBe('GENERATED');
    expect(PlanStatus.REVIEWED).toBe('REVIEWED');
    expect(PlanStatus.APPROVED).toBe('APPROVED');
  });
});

describe('User Entity Enums', () => {
  it('UserRole should have 3 roles', () => {
    expect(Object.values(UserRole)).toHaveLength(3);
    expect(UserRole.TEACHER).toBe('TEACHER');
    expect(UserRole.COORDINATOR).toBe('COORDINATOR');
    expect(UserRole.ADMIN).toBe('ADMIN');
  });
});

describe('Activity Entity Enums', () => {
  it('ActivityType should have 4 types', () => {
    expect(Object.values(ActivityType)).toHaveLength(4);
    expect(ActivityType.LESSON_DELIVERED).toBe('LESSON_DELIVERED');
    expect(ActivityType.ASSESSMENT_GIVEN).toBe('ASSESSMENT_GIVEN');
    expect(ActivityType.EXTRA_ACTIVITY).toBe('EXTRA_ACTIVITY');
    expect(ActivityType.REMEDIAL_CLASS).toBe('REMEDIAL_CLASS');
  });
});

describe('Lesson Entity Enums', () => {
  it('LessonStatus should have 5 statuses', () => {
    expect(Object.values(LessonStatus)).toHaveLength(5);
    expect(LessonStatus.DRAFT).toBe('DRAFT');
    expect(LessonStatus.READY).toBe('READY');
    expect(LessonStatus.DELIVERED).toBe('DELIVERED');
    expect(LessonStatus.PARTIALLY_COMPLETED).toBe('PARTIALLY_COMPLETED');
    expect(LessonStatus.NOT_COMPLETED).toBe('NOT_COMPLETED');
  });
});

describe('Calendar Entity Enums', () => {
  it('CalendarEventType should have 8 types', () => {
    expect(Object.values(CalendarEventType)).toHaveLength(8);
    expect(CalendarEventType.NATIONAL_HOLIDAY).toBe('NATIONAL_HOLIDAY');
    expect(CalendarEventType.SCHOOL_HOLIDAY).toBe('SCHOOL_HOLIDAY');
    expect(CalendarEventType.EXAM_PERIOD).toBe('EXAM_PERIOD');
    expect(CalendarEventType.CUSTOM).toBe('CUSTOM');
  });
});
