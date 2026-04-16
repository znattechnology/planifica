import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createLogger } from '@/src/shared/logger/logger';

const logger = createLogger('redis-rate-limit');

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// ── Upstash client (lazy-initialized) ────────────────────────────────────────

let ratelimiters: Map<string, Ratelimit> | null = null;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getRatelimiter(windowKey: string, maxRequests: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  if (!ratelimiters) ratelimiters = new Map();

  if (!ratelimiters.has(windowKey)) {
    ratelimiters.set(
      windowKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
        prefix: 'ratelimit',
        analytics: false,
      }),
    );
  }

  return ratelimiters.get(windowKey)!;
}

// ── In-memory fallback store ─────────────────────────────────────────────────

interface FallbackEntry {
  count: number;
  resetAt: number;
}
const fallbackStore = new Map<string, FallbackEntry>();

/**
 * Stricter in-memory rate limit applied when Redis is unavailable.
 * Caps abuse during outages without permanently blocking legitimate users.
 */
const REDIS_FAILURE_FALLBACK_MAX = 5;   // requests per window when Redis is down
const REDIS_FAILURE_FALLBACK_WINDOW = 60 * 60; // 1 hour

/**
 * No-Redis fallback (env vars not configured).
 * Uses the caller's configured limits — single-instance only.
 */
function checkFallbackConfigured(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): RateLimitResult {
  return checkFallbackStore(key, maxRequests, windowSeconds);
}

/**
 * Redis-error fallback: apply strict 5/hour limit to limit abuse window.
 * Still fail-open (returns allowed:true below the cap) so infra issues
 * never permanently block users.
 */
function checkFallbackStrict(key: string, identifier: string): RateLimitResult {
  const result = checkFallbackStore(
    `strict:${key}`,
    REDIS_FAILURE_FALLBACK_MAX,
    REDIS_FAILURE_FALLBACK_WINDOW,
  );

  logger.warn('Redis unavailable; applying strict in-memory fallback limit', {
    event: 'ratelimit.fallback_active',
    identifier,
    limit: REDIS_FAILURE_FALLBACK_MAX,
    allowed: result.allowed,
  });

  return result;
}

function checkFallbackStore(key: string, max: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = fallbackStore.get(key);

  if (!entry || entry.resetAt < now) {
    fallbackStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (entry.count < max) {
    entry.count++;
    return { allowed: true, remaining: max - entry.count, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Checks rate limit using Upstash Redis sliding window.
 *
 * Fallback strategy:
 * - Redis not configured → in-memory with caller-configured limits (warn once)
 * - Redis configured but fails → strict 5 req/hour in-memory (cost protection)
 *
 * System remains fail-open: users are never blocked solely due to infra issues,
 * but the abuse window is capped to 5 requests per hour during outages.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  config: { maxRequests: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = config;
  const redisConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!redisConfigured) {
    // Not configured — use in-memory with configured limits and log once
    logger.warn('Upstash Redis not configured; falling back to in-memory rate limiting', {
      event: 'ratelimit.not_configured',
      identifier,
    });
    return checkFallbackConfigured(`ratelimit:${identifier}`, maxRequests, windowSeconds);
  }

  const limiter = getRatelimiter(`${identifier}:${maxRequests}:${windowSeconds}`, maxRequests, windowSeconds);

  try {
    const result = await limiter!.limit(`ratelimit:${identifier}`);
    const retryAfterMs = result.reset - Date.now();
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  } catch (err) {
    // Redis configured but unreachable — apply strict fallback to cap abuse
    logger.warn('Redis rate limit check failed; applying strict fallback', {
      event: 'ratelimit.redis_error',
      identifier,
      error: err instanceof Error ? err.message : String(err),
    });
    return checkFallbackStrict(`ratelimit:${identifier}`, identifier);
  }
}

/** Build a 429 Too Many Requests response. */
export function rateLimitExceededResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: 'Limite de requisições atingido. Tente novamente mais tarde.',
      },
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

// Pre-configured limits
const isDev = process.env.NODE_ENV !== 'production';

export const DISTRIBUTED_RATE_LIMITS = {
  GENERATE_PLAN:   { maxRequests: isDev ? 100 : 10, windowSeconds: 60 * 60 },
  GENERATE_REPORT: { maxRequests: isDev ? 50  : 5,  windowSeconds: 60 * 60 },
} as const;
