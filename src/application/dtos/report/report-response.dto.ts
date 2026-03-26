import { ReportType, ReportStatus, ReportContent, ReportPeriod } from '@/src/domain/entities/report.entity';

export interface ReportResponseDTO {
  id: string;
  userId: string;
  type: ReportType;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  period: ReportPeriod;
  content: ReportContent;
  status: ReportStatus;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
