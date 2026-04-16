import type { NextRequest } from 'next/server';
import type { AuditLogMetadata } from '@/src/domain/entities/audit-log.entity';

/**
 * Extracts audit-relevant metadata from an incoming request.
 * Both fields are optional — never throws, never blocks the primary flow.
 */
export function extractRequestMetadata(request: NextRequest): AuditLogMetadata {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  return { ip, userAgent };
}
