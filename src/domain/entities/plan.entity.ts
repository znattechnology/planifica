export interface PlanQualityScores {
  coherenceScore: number;           // 0-10: topic continuity, no repetition
  workloadBalanceScore: number;     // 0-10: balanced weeks, no overload
  calendarAlignmentScore: number;   // 0-10: respects teaching weeks, avoids holidays
  historyComplianceScore?: number;  // 0-10: did AI actually adapt to teaching history?
  overallScore: number;             // 0-10: weighted average
  qualityLabel: 'excellent' | 'good' | 'needs_review' | 'unverified'; // simplified verdict
  evaluatedAt: string;              // ISO date
}

export interface Plan {
  id: string;
  userId: string;
  type: PlanType;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  trimester?: number;
  weekIndex?: number;
  content: PlanContent;
  status: PlanStatus;
  parentPlanId?: string;
  dosificacaoId: string;
  qualityScores?: PlanQualityScores;
  allowAutoAdjustments?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum PlanType {
  ANNUAL = 'ANNUAL',
  TRIMESTER = 'TRIMESTER',
  BIWEEKLY = 'BIWEEKLY',
  LESSON = 'LESSON',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
}

export interface PlanContent {
  generalObjectives: string[];
  specificObjectives: string[];
  competencies: string[];
  topics: TopicItem[];
  methodology?: string;
  resources?: string[];
  assessment?: string;
  observations?: string;
  rawAIOutput?: string;
  // Lesson plan specific
  topic?: string;
  duration?: number;
  lessonNumber?: number;
  lessonType?: string;
  didacticUnit?: string;
  summary?: string;
  lessonPhases?: PlanLessonPhase[];
  homework?: string;
  bibliography?: string[];
  criticalNotes?: string;
  // Trimester plan specific
  weeklyPlan?: WeeklyPlanItem[];
  totalWeeks?: number;
  totalLessons?: number;
  // Legacy fallback
  objectives?: string[];
}

export interface WeeklyPlanItem {
  week: string;
  period?: string;
  unit: string;
  objectives: string;
  contents: string;
  numLessons: number;
}

export interface TopicItem {
  title: string;
  subtopics?: string[];
  duration?: string;
  week?: number;
}

export interface PlanLessonPhase {
  name: string;
  duration: string;
  activities: string[];
  content?: string;
  methods?: string;
  resources?: string;
  assessment?: string;
}
