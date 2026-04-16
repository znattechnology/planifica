import { NextRequest } from 'next/server';
import { ReportService } from '@/src/application/services/report.service';
import { AuthService } from '@/src/auth/auth.service';
import { validateGenerateReport } from '@/src/application/validators/report.validator';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';

import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { SubscriptionAccessMiddleware } from '@/src/presentation/middleware/subscription-access.middleware';

export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
    private readonly logger: ILogger,
    private readonly subscriptionAccessMiddleware: SubscriptionAccessMiddleware,
  ) {}

  async getReports(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      this.logger.info('Fetching reports', { requestId, userId: user.id, type: 'all' });
      const reports = await this.reportService.getReports(user.id, undefined);
      return successResponse(reports);
    } catch (error) {
      this.logger.error('Failed to fetch reports', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async getReport(request: NextRequest, reportId: string) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      const report = await this.reportService.getReport(reportId);
      if (!report || report.userId !== user.id) {
        return handleApiError(new Error('Report not found'));
      }
      return successResponse(report);
    } catch (error) {
      this.logger.error('Failed to fetch report', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async generateReport(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    try {
      const user = await this.authService.getUserFromRequest(request);

      // Export (report generation) is PREMIUM-only — enforce server-side
      await this.subscriptionAccessMiddleware.check(user.id, 'export');

      const body = await request.json();
      const dto = validateGenerateReport(body);

      this.logger.info('Report generation started', {
        event: 'report.generation.start',
        requestId,
        userId: user.id,
        type: dto.type,
        subject: dto.subject,
      });

      const report = await this.reportService.generate(user.id, dto);

      this.logger.info('Report generation completed', {
        event: 'report.generation.end',
        requestId,
        userId: user.id,
        reportId: report.id,
        durationMs: Date.now() - startedAt,
      });

      return successResponse(report, 201);
    } catch (error) {
      this.logger.error('Report generation failed', error as Error, {
        event: 'report.generation.error',
        requestId,
        durationMs: Date.now() - startedAt,
      });
      return handleApiError(error);
    }
  }
}
