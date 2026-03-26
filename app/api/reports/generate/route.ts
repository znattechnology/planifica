import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const token = getAccessToken(request);
  const key = `generate-report:${token || ip}`;
  const result = checkRateLimit(key, RATE_LIMITS.GENERATE_REPORT);
  if (!result.allowed) {
    return rateLimitResponse(result);
  }

  return container.reportController.generateReport(request);
}
