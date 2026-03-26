import { PlanType, PlanContent, WeeklyPlanItem } from '@/src/domain/entities/plan.entity';
import { Dosificacao } from '@/src/domain/entities/dosificacao.entity';

export interface CalendarContext {
  terms: {
    trimester: number;
    startDate: string;
    endDate: string;
    teachingWeeks: number;
  }[];
  events: {
    title: string;
    startDate: string;
    endDate: string;
    type: string;
  }[];
  effectiveTeachingWeeks?: number;
}

export interface SiblingPlanSummary {
  title: string;
  topicTitles: string[];
  generalObjectives: string[];
}

export interface FocusWeekData {
  weeks: WeeklyPlanItem[];
  weekIndex: number;
  totalWeeksInParent: number;
}

export interface GeneratePlanInput {
  type: PlanType;
  dosificacao: Dosificacao;
  subject: string;
  grade: string;
  trimester?: number;
  week?: number;
  parentPlanContent?: PlanContent;
  focusWeekData?: FocusWeekData;
  additionalContext?: string;
  calendarContext?: CalendarContext;
  siblingPlanSummaries?: SiblingPlanSummary[];
  teachingHistory?: string; // pre-built feedback summary from TeachingHistoryService
}

export interface IAIPlanGeneratorService {
  generatePlan(input: GeneratePlanInput): Promise<PlanContent>;
}
