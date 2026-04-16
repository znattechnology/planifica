import { AuditLog, CreateAuditLogData } from '@/src/domain/entities/audit-log.entity';

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLog>;
  findByEntityId(entityId: string): Promise<AuditLog[]>;
  findByAdminId(adminId: string, limit?: number): Promise<AuditLog[]>;
}
