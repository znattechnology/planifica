import { ReportContent, ReportType } from '@/src/domain/entities/report.entity';
import { REPORT_PROMPTS } from '@/src/ai/prompts/report-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';
import { IReportGenerationStrategy, ReportGenerationContext } from './report-generation.strategy';
import { reportResponseSchema } from '@/src/ai/schemas/plan-response.schema';

export class AnnualReportStrategy implements IReportGenerationStrategy {
  readonly type = ReportType.ANNUAL;

  buildPrompt(context: ReportGenerationContext): AIMessage[] {
    const systemPrompt = `${REPORT_PROMPTS.REPORT_GENERATOR}\n\n${REPORT_PROMPTS.ANNUAL_REPORT}`;

    const plannedTopics = context.plans.flatMap((p) => p.topics.map((t) => t.title));
    const coveredTopics = context.activities.topicsCovered;
    const coveragePercent = plannedTopics.length > 0
      ? Math.round((coveredTopics.length / plannedTopics.length) * 100)
      : 0;

    const userPrompt = [
      `=== ANNUAL REPORT DATA ===`,
      ``,
      `Subject: ${context.subject}`,
      `Grade: ${context.grade}`,
      `Academic Year: ${context.period.year}`,
      `Period: ${context.period.startDate.toISOString().split('T')[0]} to ${context.period.endDate.toISOString().split('T')[0]}`,
      ``,
      `=== ANNUAL ACTIVITY STATISTICS ===`,
      `Total lessons delivered (full year): ${context.activities.totalLessons}`,
      `Total hours worked (full year): ${context.activities.totalHours}`,
      `Average student count: ${context.activities.averageStudentCount || 'N/A'}`,
      `Annual topic coverage: ${coveredTopics.length} of ${plannedTopics.length} planned (${coveragePercent}%)`,
      ``,
      `=== ALL TOPICS COVERED DURING THE YEAR ===`,
      ...coveredTopics.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `=== ANNUAL PLAN OBJECTIVES ===`,
      ...context.plans.flatMap((p) => (p.generalObjectives || p.specificObjectives || p.objectives || []).map((o) => `- ${o}`)),
      ``,
      `=== CHALLENGES (aggregated) ===`,
      ...(context.activities.commonChallenges.length > 0
        ? context.activities.commonChallenges.map((c) => `- ${c}`)
        : ['No challenges reported']),
      ``,
      `=== OUTCOMES (aggregated) ===`,
      ...(context.activities.outcomes.length > 0
        ? context.activities.outcomes.slice(0, 30).map((o) => `- ${o}`)
        : ['No specific outcomes recorded']),
    ];

    if (context.additionalContext) {
      userPrompt.push('', `=== ADDITIONAL CONTEXT (includes trimester summaries) ===`, context.additionalContext);
    }

    userPrompt.push(
      '',
      '=== OUTPUT FORMAT ===',
      'Respond in JSON with exactly these fields:',
      '{',
      '  "summary": "string - Comprehensive annual summary",',
      '  "objectivesAchieved": [{ "description": "string", "status": "achieved|partial|not_achieved", "evidence": "string" }],',
      '  "topicsCovered": [{ "title": "string", "hoursSpent": number, "completionPercentage": number, "observations": "string" }],',
      '  "studentPerformance": "string - Year-long performance trends",',
      '  "methodology": "string - Methodology evolution and effectiveness",',
      '  "challenges": ["string - Systemic challenges"],',
      '  "recommendations": ["string - Strategic recommendations for next year"],',
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
    try {
      const parsed = reportResponseSchema.parse(JSON.parse(raw));
      return {
        ...parsed,
        rawAIOutput: raw,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        summary: '',
        objectivesAchieved: [],
        topicsCovered: [],
        studentPerformance: '',
        methodology: '',
        challenges: [],
        recommendations: [],
        statistics: { totalLessonsDelivered: 0, totalHoursWorked: 0, totalTopicsCovered: 0, plannedVsDelivered: 0 },
        criticalNotes: `Erro ao processar resposta da IA: ${errorMessage.substring(0, 500)}`,
        rawAIOutput: raw,
      } as ReportContent;
    }
  }
}
