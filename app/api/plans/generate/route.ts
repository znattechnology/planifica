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
  // Per-user distributed rate limit (sliding window via Upstash Redis)
  // Falls back to in-memory if Redis is not configured.
  const token = getAccessToken(request);
  const ip = getClientIp(request);
  const identifier = `generate_plan:${token ?? ip}`;

  const rl = await checkDistributedRateLimit(identifier, DISTRIBUTED_RATE_LIMITS.GENERATE_PLAN);
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.retryAfterSeconds);
  }

  return container.planController.generatePlan(request);
}
