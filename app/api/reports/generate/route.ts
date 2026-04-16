import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';
import { getClientIp } from '@/src/shared/lib/rate-limit';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import {
  checkDistributedRateLimit,
  rateLimitExceededResponse,
  DISTRIBUTED_RATE_LIMITS,
} from '@/src/shared/lib/redis-rate-limit';

export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  const ip = getClientIp(request);
  const identifier = `generate_report:${token ?? ip}`;

  const rl = await checkDistributedRateLimit(identifier, DISTRIBUTED_RATE_LIMITS.GENERATE_REPORT);
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.retryAfterSeconds);
  }

  return container.reportController.generateReport(request);
}
