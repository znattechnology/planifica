import { Prisma } from '@prisma/client';
import { prisma } from '@/src/infrastructure/database/prisma/client';
import { AuditLog, AuditLogMetadata, CreateAuditLogData } from '@/src/domain/entities/audit-log.entity';
import { IAuditLogRepository } from '@/src/domain/interfaces/repositories/audit-log.repository';

function mapAuditLog(raw: {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
}): AuditLog {
  return {
    id: raw.id,
    adminId: raw.adminId,
    action: raw.action,
    entityType: raw.entityType as AuditLog['entityType'],
    entityId: raw.entityId,
    before: raw.before as Record<string, unknown>,
    after: raw.after as Record<string, unknown>,
    metadata: raw.metadata ? (raw.metadata as AuditLogMetadata) : undefined,
    createdAt: raw.createdAt,
  };
}

export class PrismaAuditLogRepository implements IAuditLogRepository {
  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const raw = await prisma.auditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before as Prisma.InputJsonValue,
        after: data.after as Prisma.InputJsonValue,
        metadata: data.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    });
    return mapAuditLog(raw);
  }

  async findByEntityId(entityId: string): Promise<AuditLog[]> {
    const rows = await prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapAuditLog);
  }

  async findByAdminId(adminId: string, limit = 50): Promise<AuditLog[]> {
    const rows = await prisma.auditLog.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(mapAuditLog);
  }
}
