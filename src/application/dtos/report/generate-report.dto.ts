import { ReportType } from '@/src/domain/entities/report.entity';

export interface GenerateReportDTO {
  type: ReportType;
  subject: string;
  grade: string;
  academicYear: string;
  trimester?: number;
  additionalContext?: string;
}
