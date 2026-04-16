export interface PlanQualityScores {
  coherenceScore: number;           // 0-10: topic continuity, no repetition
  workloadBalanceScore: number;     // 0-10: balanced weeks, no overload
  calendarAlignmentScore: number;   // 0-10: respects teaching weeks, avoids holidays
  historyComplianceScore?: number;  // 0-10: did AI actually adapt to teaching history?
  overallScore: number;             // 0-10: weighted average
  qualityScore100: number;          // 0-100: overallScore * 10, for UI display
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
  calendarId?: string;
  calendarVersion?: number;
  calendarSnapshot?: Record<string, unknown>;
  calendarSource?: 'selected' | 'ministerial' | 'legacy' | 'none';
  qualityScores?: PlanQualityScores;
  allowAutoAdjustments?: boolean;
  generatingStartedAt?: Date;
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
  /** Non-blocking pedagogical feedback for the teacher. Populated from quality analysis. */
  feedback?: string[];
  /** Actionable suggestions shown when plan generation fails or is degraded. */
  suggestions?: string[];
  // Trimester plan specific
  weeklyPlan?: WeeklyPlanItem[];
  totalWeeks?: number;
  totalLessons?: number;
  // Annual plan specific — trimester-partitioned structure (source of truth for TrimesterPlanStrategy)
  trimesters?: AnnualTrimesterSection[];
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

export interface AnnualTrimesterSection {
  number: 1 | 2 | 3;
  startDate?: string;    // YYYY-MM-DD — from calendar
  endDate?: string;      // YYYY-MM-DD — from calendar
  estimatedWeeks: number;
  topics: TopicItem[];
  generalObjectives: string[];
  specificObjectives: string[];
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
