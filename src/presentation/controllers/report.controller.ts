import { NextRequest } from 'next/server';
import { ReportService } from '@/src/application/services/report.service';
import { AuthService } from '@/src/auth/auth.service';
import { validateGenerateReport } from '@/src/application/validators/report.validator';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { ReportType } from '@/src/domain/entities/report.entity';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
    private readonly logger: ILogger,
  ) {}

  async getReports(request: NextRequest) {
    try {
      const user = await this.authService.getUserFromRequest(request);
      const type = request.nextUrl.searchParams.get('type') as ReportType | null;

      this.logger.info('Fetching reports', { userId: user.id, type: type || 'all' });

      const reports = await this.reportService.getReports(user.id, type || undefined);
      return successResponse(reports);
    } catch (error) {
      this.logger.error('Failed to fetch reports', error as Error);
      return handleApiError(error);
    }
  }

  async getReport(request: NextRequest, reportId: string) {
    try {
      const user = await this.authService.getUserFromRequest(request);

      const report = await this.reportService.getReport(reportId);
      if (!report || report.userId !== user.id) {
        return handleApiError(new Error('Report not found'));
      }
      return successResponse(report);
    } catch (error) {
      this.logger.error('Failed to fetch report', error as Error);
      return handleApiError(error);
    }
  }

  async generateReport(request: NextRequest) {
    try {
      const user = await this.authService.getUserFromRequest(request);
      const body = await request.json();
      const dto = validateGenerateReport(body);

      this.logger.info('Generating report', {
        userId: user.id,
        type: dto.type,
        subject: dto.subject,
        trimester: dto.trimester,
      });

      const report = await this.reportService.generate(user.id, dto);
      return successResponse(report, 201);
    } catch (error) {
      this.logger.error('Failed to generate report', error as Error);
      return handleApiError(error);
    }
  }
}
