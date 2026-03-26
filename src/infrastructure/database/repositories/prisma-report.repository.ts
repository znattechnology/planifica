import { IReportRepository } from '@/src/domain/interfaces/repositories/report.repository';
import { Report, ReportType, ReportStatus } from '@/src/domain/entities/report.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

export class PrismaReportRepository implements IReportRepository {
  async findById(id: string): Promise<Report | null> {
    const report = await prisma.report.findUnique({ where: { id } });
    return report as unknown as Report | null;
  }

  async findByUserId(userId: string): Promise<Report[]> {
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return reports as unknown as Report[];
  }

  async findByType(userId: string, type: ReportType): Promise<Report[]> {
    const reports = await prisma.report.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
    return reports as unknown as Report[];
  }

  async findByPeriod(userId: string, year: number, trimester?: number): Promise<Report[]> {
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by period JSON field
    return (reports as unknown as Report[]).filter((r) => {
      if (r.period.year !== year) return false;
      if (trimester !== undefined && r.period.trimester !== trimester) return false;
      return true;
    });
  }

  async findExisting(
    userId: string,
    type: ReportType,
    subject: string,
    grade: string,
    year: number,
    trimester?: number,
  ): Promise<Report | null> {
    const reports = await prisma.report.findMany({
      where: { userId, type, subject, grade },
      orderBy: { createdAt: 'desc' },
    });

    const match = (reports as unknown as Report[]).find((r) => {
      if (r.period.year !== year) return false;
      if (trimester !== undefined && r.period.trimester !== trimester) return false;
      return true;
    });

    return match || null;
  }

  async create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const report = await prisma.report.create({ data: data as never });
    return report as unknown as Report;
  }

  async update(id: string, data: Partial<Report>): Promise<Report> {
    const report = await prisma.report.update({
      where: { id },
      data: data as never,
    });
    return report as unknown as Report;
  }

  async updateStatus(id: string, status: ReportStatus): Promise<Report> {
    const report = await prisma.report.update({
      where: { id },
      data: { status },
    });
    return report as unknown as Report;
  }

  async delete(id: string): Promise<void> {
    await prisma.report.delete({ where: { id } });
  }
}
