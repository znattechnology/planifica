import { Report } from '@/src/domain/entities/report.entity';
import { ReportResponseDTO } from '@/src/application/dtos/report';

export class ReportMapper {
  static toDTO(report: Report): ReportResponseDTO {
    return {
      id: report.id,
      userId: report.userId,
      type: report.type,
      title: report.title,
      subject: report.subject,
      grade: report.grade,
      academicYear: report.academicYear,
      period: report.period,
      content: report.content,
      status: report.status,
      generatedAt: report.generatedAt?.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  static toDTOList(reports: Report[]): ReportResponseDTO[] {
    return reports.map(ReportMapper.toDTO);
  }
}
