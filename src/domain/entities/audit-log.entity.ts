export type AuditEntityType = 'SUBSCRIPTION' | 'PAYMENT';

export interface AuditLogMetadata {
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata?: AuditLogMetadata;
  createdAt: Date;
}

export type CreateAuditLogData = Omit<AuditLog, 'id' | 'createdAt'>;
