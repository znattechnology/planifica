import { ReportContent, ReportType, ReportPeriod } from '@/src/domain/entities/report.entity';
import { AggregatedActivity } from '@/src/domain/entities/teaching-activity.entity';
import { PlanContent } from '@/src/domain/entities/plan.entity';

export interface GenerateReportInput {
  type: ReportType;
  subject: string;
  grade: string;
  period: ReportPeriod;
  activities: AggregatedActivity;
  plans: PlanContent[];
  additionalContext?: string;
}

export interface IAIReportGeneratorService {
  generateReport(input: GenerateReportInput): Promise<ReportContent>;
}
