import { IAIPlanGeneratorService, GeneratePlanInput } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { PlanContent } from '@/src/domain/entities/plan.entity';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { AIClient } from './ai-client';
import { getStrategy } from '@/src/ai/strategies';
import { buildCacheKey } from '@/src/cache/cache.service';
import { AI_TEMPERATURE, AI_MAX_TOKENS } from '@/src/ai/config';

const CACHE_TTL = 3600; // 1 hour

export class AIPlanGeneratorService implements IAIPlanGeneratorService {
  constructor(
    private readonly aiClient: AIClient,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  async generatePlan(input: GeneratePlanInput): Promise<PlanContent> {
    // Cache key includes parent context and siblings fingerprint to avoid stale hits
    const siblingFingerprint = input.siblingPlanSummaries
      ? input.siblingPlanSummaries.map(s => s.title).sort().join('|')
      : '';

    const cacheKey = buildCacheKey(
      'plan',
      input.calendarId || '_',
      input.type,
      input.dosificacao.id,
      input.subject,
      input.grade,
      String(input.trimester || ''),
      String(input.week || ''),
      siblingFingerprint,
    );

    const cached = await this.cache.get<PlanContent>(cacheKey);
    if (cached) {
      this.logger.info('Plan content served from cache', { cacheKey, planType: input.type });
      return cached;
    }

    const strategy = getStrategy(input.type);

    this.logger.info('Generating plan with AI', {
      planType: input.type,
      subject: input.subject,
      grade: input.grade,
      hasFocusWeek: !!input.focusWeekData,
      hasCalendar: !!input.calendarContext,
      siblingCount: input.siblingPlanSummaries?.length || 0,
      hasTeachingHistory: !!input.teachingHistory,
    });

    const messages = strategy.buildPrompt({
      dosificacao: input.dosificacao,
      subject: input.subject,
      grade: input.grade,
      trimester: input.trimester,
      week: input.week,
      parentPlanContent: input.parentPlanContent,
      focusWeekData: input.focusWeekData,
      additionalContext: input.additionalContext,
      calendarContext: input.calendarContext,
      siblingPlanSummaries: input.siblingPlanSummaries,
      teachingHistory: input.teachingHistory,
      adjustedWeekTemplate: input.adjustedWeekTemplate,
    });

    const response = await this.aiClient.complete({
      messages,
      responseFormat: 'json',
      config: { temperature: AI_TEMPERATURE, maxTokens: AI_MAX_TOKENS },
    });

    this.logger.info('AI response received', {
      planType: input.type,
      tokensUsed: response.usage.totalTokens,
      model: response.model,
    });

    const content = strategy.parseResponse(response.content);

    await this.cache.set(cacheKey, content, CACHE_TTL);

    return content;
  }
}
