import { Report, ReportType, ReportStatus } from '@/src/domain/entities/report.entity';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findByUserId(userId: string): Promise<Report[]>;
  findByType(userId: string, type: ReportType): Promise<Report[]>;
  findByPeriod(
    userId: string,
    year: number,
    trimester?: number,
  ): Promise<Report[]>;
  findExisting(
    userId: string,
    type: ReportType,
    subject: string,
    grade: string,
    year: number,
    trimester?: number,
  ): Promise<Report | null>;
  create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report>;
  update(id: string, data: Partial<Report>): Promise<Report>;
  updateStatus(id: string, status: ReportStatus): Promise<Report>;
  delete(id: string): Promise<void>;
}
