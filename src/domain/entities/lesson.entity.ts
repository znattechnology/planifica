export interface Lesson {
  id: string;
  planId: string;
  userId: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  topic: string;
  content: LessonContent;
  status: LessonStatus;
  teacherNotes?: string;
  actualDuration?: number; // in minutes — what actually happened
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonContent {
  objective: string;
  competencies: string[];
  introduction: LessonPhase;
  development: LessonPhase;
  conclusion: LessonPhase;
  resources: string[];
  assessment: string;
  homework?: string;
}

export interface LessonPhase {
  description: string;
  duration: number; // in minutes
  activities: string[];
  teacherActions: string[];
  studentActions: string[];
}

export enum LessonStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  NOT_COMPLETED = 'NOT_COMPLETED',
}
