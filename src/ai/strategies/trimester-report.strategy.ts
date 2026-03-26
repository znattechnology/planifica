import { ReportContent, ReportType } from '@/src/domain/entities/report.entity';
import { REPORT_PROMPTS } from '@/src/ai/prompts/report-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IReportGenerationStrategy, ReportGenerationContext } from './report-generation.strategy';
import { reportResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class TrimesterReportStrategy implements IReportGenerationStrategy {
  readonly type = ReportType.TRIMESTER;

  buildPrompt(context: ReportGenerationContext): AIMessage[] {
    const systemPrompt = `${REPORT_PROMPTS.REPORT_GENERATOR}\n\n${REPORT_PROMPTS.TRIMESTER_REPORT}`;

    const plannedTopics = context.plans.flatMap((p) => p.topics.map((t) => t.title));
    const coveredTopics = context.activities.topicsCovered;
    const coveragePercent = plannedTopics.length > 0
      ? Math.round((coveredTopics.length / plannedTopics.length) * 100)
      : 0;

    const userPrompt = [
      `=== TRIMESTER REPORT DATA ===`,
      ``,
      `Subject: ${context.subject}`,
      `Grade: ${context.grade}`,
      `Trimester: ${context.period.trimester}`,
      `Period: ${context.period.startDate.toISOString().split('T')[0]} to ${context.period.endDate.toISOString().split('T')[0]}`,
      ``,
      `=== ACTIVITY STATISTICS ===`,
      `Total lessons delivered: ${context.activities.totalLessons}`,
      `Total hours worked: ${context.activities.totalHours}`,
      `Average student count: ${context.activities.averageStudentCount || 'N/A'}`,
      `Topics covered: ${coveredTopics.length} of ${plannedTopics.length} planned (${coveragePercent}%)`,
      ``,
      `=== TOPICS COVERED ===`,
      ...coveredTopics.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `=== PLANNED TOPICS (from plan) ===`,
      ...plannedTopics.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `=== CHALLENGES REPORTED ===`,
      ...(context.activities.commonChallenges.length > 0
        ? context.activities.commonChallenges.map((c) => `- ${c}`)
        : ['No challenges reported']),
      ``,
      `=== OUTCOMES OBSERVED ===`,
      ...(context.activities.outcomes.length > 0
        ? context.activities.outcomes.slice(0, 20).map((o) => `- ${o}`)
        : ['No specific outcomes recorded']),
      ``,
      `=== PLANNED OBJECTIVES ===`,
      ...context.plans.flatMap((p) => (p.generalObjectives || p.specificObjectives || p.objectives || []).map((o) => `- ${o}`)),
    ];

    if (context.additionalContext) {
      userPrompt.push('', `=== ADDITIONAL CONTEXT ===`, context.additionalContext);
    }

    userPrompt.push(
      '',
      '=== OUTPUT FORMAT ===',
      'Respond in JSON with exactly these fields:',
      '{',
      '  "summary": "string - Executive summary of the trimester",',
      '  "objectivesAchieved": [{ "description": "string", "status": "achieved|partial|not_achieved", "evidence": "string" }],',
      '  "topicsCovered": [{ "title": "string", "hoursSpent": number, "completionPercentage": number, "observations": "string" }],',
      '  "studentPerformance": "string - Assessment of student progress",',
      '  "methodology": "string - Methods used and effectiveness",',
      '  "challenges": ["string"],',
      '  "recommendations": ["string"],',
      '  "statistics": {',
      '    "totalLessonsDelivered": number,',
      '    "totalHoursWorked": number,',
      '    "totalTopicsCovered": number,',
      '    "plannedVsDelivered": number (percentage)',
      '  }',
      '}',
    );

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt.join('\n') },
    ];
  }

  parseResponse(raw: string): ReportContent {
    const parsed = reportResponseSchema.parse(JSON.parse(raw));
    return {
      ...parsed,
      rawAIOutput: raw,
    };
  }
}
