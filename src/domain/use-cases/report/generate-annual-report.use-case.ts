import { Report, ReportType, ReportStatus, ReportContent } from '@/src/domain/entities/report.entity';
import { IReportRepository } from '@/src/domain/interfaces/repositories/report.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { IAIReportGeneratorService } from '@/src/domain/interfaces/services/report-generator.service';
import { AggregateActivitiesUseCase } from './aggregate-activities.use-case';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export interface GenerateAnnualReportInput {
  userId: string;
  subject: string;
  grade: string;
  academicYear: string;
  additionalContext?: string;
  includeTrimesterData?: boolean;
}

export class GenerateAnnualReportUseCase {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly planRepository: IPlanRepository,
    private readonly aggregateActivities: AggregateActivitiesUseCase,
    private readonly aiReportGenerator: IAIReportGeneratorService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: GenerateAnnualReportInput): Promise<Report> {
    const year = parseInt(input.academicYear.split('/')[0] || input.academicYear, 10);

    // Check for existing report
    const existing = await this.reportRepository.findExisting(
      input.userId,
      ReportType.ANNUAL,
      input.subject,
      input.grade,
      year,
    );

    if (existing && existing.status !== ReportStatus.DRAFT) {
      this.logger.info('Returning existing annual report', {
        reportId: existing.id,
        userId: input.userId,
      });
      return existing;
    }

    this.logger.info('Generating annual report', {
      userId: input.userId,
      subject: input.subject,
      academicYear: input.academicYear,
    });

    const startDate = new Date(year, 0, 15);  // Jan 15
    const endDate = new Date(year, 11, 15);   // Dec 15

    // Aggregate full-year activities
    const activities = await this.aggregateActivities.execute({
      userId: input.userId,
      subject: input.subject,
      grade: input.grade,
      startDate,
      endDate,
    });

    // Fetch annual plans for reference
    const annualPlansResult = await this.planRepository.findByType(input.userId, PlanType.ANNUAL);
    const relevantPlans = annualPlansResult.data.filter(
      (p) => p.subject === input.subject && p.grade === input.grade,
    );
    const planContents = relevantPlans.map((p) => p.content);

    // Optionally include trimester report data for richer context
    let trimesterReportContents: ReportContent[] = [];
    if (input.includeTrimesterData !== false) {
      const trimesterReports = await this.reportRepository.findByType(
        input.userId,
        ReportType.TRIMESTER,
      );
      trimesterReportContents = trimesterReports
        .filter(
          (r) =>
            r.subject === input.subject &&
            r.grade === input.grade &&
            r.period.year === year &&
            r.status !== ReportStatus.DRAFT,
        )
        .map((r) => r.content);
    }

    const period = { year, startDate, endDate };

    // Create draft
    const report = await this.reportRepository.create({
      userId: input.userId,
      type: ReportType.ANNUAL,
      title: `Relatório Anual ${input.academicYear} - ${input.subject} - ${input.grade}`,
      subject: input.subject,
      grade: input.grade,
      academicYear: input.academicYear,
      period,
      content: {
        summary: '',
        objectivesAchieved: [],
        topicsCovered: [],
        studentPerformance: '',
        methodology: '',
        challenges: [],
        recommendations: [],
        statistics: {
          totalLessonsDelivered: 0,
          totalHoursWorked: 0,
          totalTopicsCovered: 0,
          plannedVsDelivered: 0,
        },
      },
      status: ReportStatus.GENERATING,
    });

    // Build additional context from trimester reports
    let extraContext = input.additionalContext || '';
    if (trimesterReportContents.length > 0) {
      extraContext += '\n\nTrimester reports summaries:\n';
      trimesterReportContents.forEach((tc, i) => {
        extraContext += `\nTrimester ${i + 1}: ${tc.summary}\n`;
        extraContext += `Challenges: ${tc.challenges.join(', ')}\n`;
        extraContext += `Recommendations: ${tc.recommendations.join(', ')}\n`;
      });
    }

    const generatedContent = await this.aiReportGenerator.generateReport({
      type: ReportType.ANNUAL,
      subject: input.subject,
      grade: input.grade,
      period,
      activities,
      plans: planContents,
      additionalContext: extraContext || undefined,
    });

    const updated = await this.reportRepository.update(report.id, {
      content: generatedContent,
      status: ReportStatus.GENERATED,
      generatedAt: new Date(),
    });

    this.logger.info('Annual report generated', {
      reportId: updated.id,
      userId: input.userId,
    });

    return updated;
  }
}
