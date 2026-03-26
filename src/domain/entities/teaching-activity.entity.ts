export interface TeachingActivity {
  id: string;
  userId: string;
  lessonId?: string;
  planId?: string;
  type: ActivityType;
  subject: string;
  grade: string;
  topic: string;
  description: string;
  date: Date;
  duration: number; // in minutes
  studentCount?: number;
  notes?: string;
  outcomes?: string[];
  challenges?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ActivityType {
  LESSON_DELIVERED = 'LESSON_DELIVERED',
  ASSESSMENT_GIVEN = 'ASSESSMENT_GIVEN',
  EXTRA_ACTIVITY = 'EXTRA_ACTIVITY',
  REMEDIAL_CLASS = 'REMEDIAL_CLASS',
}

export interface AggregatedActivity {
  subject: string;
  grade: string;
  totalLessons: number;
  totalHours: number;
  topicsCovered: string[];
  averageStudentCount: number;
  commonChallenges: string[];
  outcomes: string[];
  dateRange: { start: Date; end: Date };
}
