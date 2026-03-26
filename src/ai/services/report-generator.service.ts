import { IAIReportGeneratorService, GenerateReportInput } from '@/src/domain/interfaces/services/report-generator.service';
import { ReportContent, ReportType } from '@/src/domain/entities/report.entity';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { AIClient } from './ai-client';
import { IReportGenerationStrategy } from '@/src/ai/strategies/report-generation.strategy';
import { TrimesterReportStrategy } from '@/src/ai/strategies/trimester-report.strategy';
import { AnnualReportStrategy } from '@/src/ai/strategies/annual-report.strategy';
import { buildCacheKey } from '@/src/cache/cache.service';

const REPORT_CACHE_TTL = 7200; // 2 hours (reports change less frequently)

export class AIReportGeneratorService implements IAIReportGeneratorService {
  private strategies: Record<ReportType, IReportGenerationStrategy>;

  constructor(
    private readonly aiClient: AIClient,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {
    this.strategies = {
      [ReportType.TRIMESTER]: new TrimesterReportStrategy(),
      [ReportType.ANNUAL]: new AnnualReportStrategy(),
    };
  }

  async generateReport(input: GenerateReportInput): Promise<ReportContent> {
    const cacheKey = buildCacheKey(
      'report',
      input.type,
      input.subject,
      input.grade,
      String(input.period.year),
      String(input.period.trimester || 'annual'),
      String(input.activities.totalLessons), // invalidate cache when activity count changes
    );

    const cached = await this.cache.get<ReportContent>(cacheKey);
    if (cached) {
      this.logger.info('Report content served from cache', {
        cacheKey,
        reportType: input.type,
      });
      return cached;
    }

    const strategy = this.strategies[input.type];
    if (!strategy) {
      throw new Error(`No generation strategy found for report type: ${input.type}`);
    }

    this.logger.info('Generating report with AI', {
      reportType: input.type,
      subject: input.subject,
      totalActivities: input.activities.totalLessons,
    });

    const messages = strategy.buildPrompt({
      subject: input.subject,
      grade: input.grade,
      period: input.period,
      activities: input.activities,
      plans: input.plans,
      additionalContext: input.additionalContext,
    });

    const response = await this.aiClient.complete({
      messages,
      responseFormat: 'json',
      config: { maxTokens: 8192 },
    });

    this.logger.info('AI report response received', {
      reportType: input.type,
      tokensUsed: response.usage.totalTokens,
    });

    const content = strategy.parseResponse(response.content);

    await this.cache.set(cacheKey, content, REPORT_CACHE_TTL);

    return content;
  }
}
