import { Report, ReportType, ReportStatus } from '@/src/domain/entities/report.entity';
import { IReportRepository } from '@/src/domain/interfaces/repositories/report.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { IAIReportGeneratorService } from '@/src/domain/interfaces/services/report-generator.service';
import { AggregateActivitiesUseCase } from './aggregate-activities.use-case';
import { PlanType } from '@/src/domain/entities/plan.entity';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export interface GenerateTrimesterReportInput {
  userId: string;
  subject: string;
  grade: string;
  academicYear: string;
  trimester: number; // 1, 2, or 3
  additionalContext?: string;
}

export class GenerateTrimesterReportUseCase {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly planRepository: IPlanRepository,
    private readonly aggregateActivities: AggregateActivitiesUseCase,
    private readonly aiReportGenerator: IAIReportGeneratorService,
    private readonly logger: ILogger,
    private readonly schoolCalendarRepository: ISchoolCalendarRepository,
  ) {}

  async execute(input: GenerateTrimesterReportInput): Promise<Report> {
    const year = parseInt(input.academicYear.split('/')[0] || input.academicYear, 10);
    const { startDate, endDate } = await this.getTrimesterDates(
      input.userId, input.academicYear, year, input.trimester,
    );

    // Check for existing report to avoid regeneration
    const existing = await this.reportRepository.findExisting(
      input.userId,
      ReportType.TRIMESTER,
      input.subject,
      input.grade,
      year,
      input.trimester,
    );

    if (existing && existing.status !== ReportStatus.DRAFT) {
      this.logger.info('Returning existing trimester report', {
        reportId: existing.id,
        userId: input.userId,
      });
      return existing;
    }

    this.logger.info('Generating trimester report', {
      userId: input.userId,
      subject: input.subject,
      trimester: input.trimester,
    });

    // Aggregate teacher activities for the trimester
    const activities = await this.aggregateActivities.execute({
      userId: input.userId,
      subject: input.subject,
      grade: input.grade,
      startDate,
      endDate,
    });

    // Fetch trimester plans for reference
    const allPlansResult = await this.planRepository.findByType(input.userId, PlanType.TRIMESTER);
    const trimesterPlans = allPlansResult.data.filter(
      (p) => p.subject === input.subject && p.grade === input.grade,
    );
    const planContents = trimesterPlans.map((p) => p.content);

    const period = { trimester: input.trimester, year, startDate, endDate };

    // Create draft report
    const report = await this.reportRepository.create({
      userId: input.userId,
      type: ReportType.TRIMESTER,
      title: `Relatório ${input.trimester}º Trimestre - ${input.subject} - ${input.grade}`,
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

    // Generate AI content
    const generatedContent = await this.aiReportGenerator.generateReport({
      type: ReportType.TRIMESTER,
      subject: input.subject,
      grade: input.grade,
      period,
      activities,
      plans: planContents,
      additionalContext: input.additionalContext,
    });

    // Update report with generated content
    const updated = await this.reportRepository.update(report.id, {
      content: generatedContent,
      status: ReportStatus.GENERATED,
      generatedAt: new Date(),
    });

    this.logger.info('Trimester report generated', {
      reportId: updated.id,
      userId: input.userId,
    });

    return updated;
  }

  private async getTrimesterDates(
    userId: string,
    academicYear: string,
    year: number,
    trimester: number,
  ): Promise<{ startDate: Date; endDate: Date }> {
    // Try real calendar first
    try {
      const calendar = await this.schoolCalendarRepository.findByUserAndYear(userId, academicYear);
      if (calendar) {
        const term = calendar.terms.find(t => t.trimester === trimester);
        if (term) {
          return { startDate: term.startDate, endDate: term.endDate };
        }
      }
    } catch {
      this.logger.warn('Failed to fetch school calendar for report, using fallback', {
        userId, academicYear, trimester,
      });
    }

    // Fallback: Angolan academic calendar
    // Trimester 1 uses startYear, trimesters 2 and 3 use endYear
    const endYear = year + 1;
    const periods: Record<number, { y: number; start: [number, number]; end: [number, number] }> = {
      1: { y: year,    start: [9, 1],  end: [12, 15] }, // Sep 1 - Dec 15
      2: { y: endYear, start: [1, 10], end: [3, 31] },  // Jan 10 - Mar 31
      3: { y: endYear, start: [4, 7],  end: [7, 15] },  // Apr 7 - Jul 15
    };

    const p = periods[trimester] || periods[1];
    return {
      startDate: new Date(p.y, p.start[0] - 1, p.start[1]),
      endDate: new Date(p.y, p.end[0] - 1, p.end[1]),
    };
  }
}
