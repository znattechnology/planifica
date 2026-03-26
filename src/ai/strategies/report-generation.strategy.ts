import { ReportContent, ReportType, ReportPeriod } from '@/src/domain/entities/report.entity';
import { AggregatedActivity } from '@/src/domain/entities/teaching-activity.entity';
import { PlanContent } from '@/src/domain/entities/plan.entity';
import { AIMessage } from '@/src/ai/types/ai.types';

export interface ReportGenerationContext {
  subject: string;
  grade: string;
  period: ReportPeriod;
  activities: AggregatedActivity;
  plans: PlanContent[];
  additionalContext?: string;
}

export interface IReportGenerationStrategy {
  readonly type: ReportType;
  buildPrompt(context: ReportGenerationContext): AIMessage[];
  parseResponse(raw: string): ReportContent;
}
