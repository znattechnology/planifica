import { PlanContent, PlanType } from '@/src/domain/entities/plan.entity';
import { Dosificacao } from '@/src/domain/entities/dosificacao.entity';
import { AIMessage } from '@/src/ai/types/ai.types';
import { CalendarContext, SiblingPlanSummary, FocusWeekData } from '@/src/domain/interfaces/services/ai-plan-generator.service';

export interface PlanGenerationContext {
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
  teachingHistory?: string;
}

export interface IPlanGenerationStrategy {
  readonly type: PlanType;
  buildPrompt(context: PlanGenerationContext): AIMessage[];
  parseResponse(raw: string): PlanContent;
}
