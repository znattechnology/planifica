import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with Redis-based solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxAttempts: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check rate limit for a given key (e.g., IP address or "login:IP").
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired window — allow and start new window
  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return { allowed: true, remaining: config.maxAttempts - 1, retryAfterSeconds: 0 };
  }

  // Within window
  if (entry.count < config.maxAttempts) {
    entry.count++;
    return { allowed: true, remaining: config.maxAttempts - entry.count, retryAfterSeconds: 0 };
  }

  // Rate limited
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds };
}

/**
 * Build a 429 Too Many Requests response (reusable across API routes).
 */
export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: `Demasiadas tentativas. Tente novamente em ${result.retryAfterSeconds} segundos.`,
      },
    },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  );
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const isDev = process.env.NODE_ENV !== 'production';

// Pre-configured rate limiters
// In development, limits are 10x more generous for testing
export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes (50 in dev) */
  LOGIN: { maxAttempts: isDev ? 50 : 5, windowSeconds: 15 * 60 },
  /** Verify email code: 5 attempts per 15 minutes (50 in dev) */
  VERIFY_CODE: { maxAttempts: isDev ? 50 : 5, windowSeconds: 15 * 60 },
  /** Forgot password: 3 requests per 15 minutes (30 in dev) */
  FORGOT_PASSWORD: { maxAttempts: isDev ? 30 : 3, windowSeconds: 15 * 60 },
  /** Resend code: 3 requests per 5 minutes (30 in dev) */
  RESEND_CODE: { maxAttempts: isDev ? 30 : 3, windowSeconds: 5 * 60 },
  /** Register: 3 accounts per hour per IP (30 in dev) */
  REGISTER: { maxAttempts: isDev ? 30 : 3, windowSeconds: 60 * 60 },
  /** AI Plan generation: 10 per hour per user (100 in dev) */
  GENERATE_PLAN: { maxAttempts: isDev ? 100 : 10, windowSeconds: 60 * 60 },
  /** AI Report generation: 5 per hour per user (50 in dev) */
  GENERATE_REPORT: { maxAttempts: isDev ? 50 : 5, windowSeconds: 60 * 60 },
  /** General API writes: 60 per minute per user (600 in dev) */
  API_WRITE: { maxAttempts: isDev ? 600 : 60, windowSeconds: 60 },
} as const;
