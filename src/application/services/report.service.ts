import { GenerateTrimesterReportUseCase } from '@/src/domain/use-cases/report/generate-trimester-report.use-case';
import { GenerateAnnualReportUseCase } from '@/src/domain/use-cases/report/generate-annual-report.use-case';
import { IReportRepository } from '@/src/domain/interfaces/repositories/report.repository';
import { GenerateReportDTO, ReportResponseDTO } from '@/src/application/dtos/report';
import { ReportMapper } from '@/src/application/mappers/report.mapper';
import { ReportType } from '@/src/domain/entities/report.entity';

export class ReportService {
  constructor(
    private readonly generateTrimesterReport: GenerateTrimesterReportUseCase,
    private readonly generateAnnualReport: GenerateAnnualReportUseCase,
    private readonly reportRepository: IReportRepository,
  ) {}

  async generate(userId: string, dto: GenerateReportDTO): Promise<ReportResponseDTO> {
    if (dto.type === ReportType.TRIMESTER) {
      const report = await this.generateTrimesterReport.execute({
        userId,
        subject: dto.subject,
        grade: dto.grade,
        academicYear: dto.academicYear,
        trimester: dto.trimester!,
        additionalContext: dto.additionalContext,
      });
      return ReportMapper.toDTO(report);
    }

    const report = await this.generateAnnualReport.execute({
      userId,
      subject: dto.subject,
      grade: dto.grade,
      academicYear: dto.academicYear,
      additionalContext: dto.additionalContext,
      includeTrimesterData: true,
    });
    return ReportMapper.toDTO(report);
  }

  async getReports(userId: string, type?: ReportType): Promise<ReportResponseDTO[]> {
    const reports = type
      ? await this.reportRepository.findByType(userId, type)
      : await this.reportRepository.findByUserId(userId);
    return ReportMapper.toDTOList(reports);
  }

  async getReport(reportId: string): Promise<ReportResponseDTO | null> {
    const report = await this.reportRepository.findById(reportId);
    return report ? ReportMapper.toDTO(report) : null;
  }
}
