import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/src/shared/lib/rate-limit';
import type { RateLimitConfig } from '@/src/shared/lib/rate-limit';

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { maxAttempts: 3, windowSeconds: 60 };

  it('should allow first request', () => {
    const key = `test-allow-${Date.now()}`;
    const result = checkRateLimit(key, config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('should decrement remaining on subsequent requests', () => {
    const key = `test-decrement-${Date.now()}`;
    checkRateLimit(key, config); // 1st
    const result = checkRateLimit(key, config); // 2nd

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should block after max attempts reached', () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, config); // 1st
    checkRateLimit(key, config); // 2nd
    checkRateLimit(key, config); // 3rd — last allowed

    const result = checkRateLimit(key, config); // 4th — blocked

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('should use separate counters for different keys', () => {
    const keyA = `test-key-a-${Date.now()}`;
    const keyB = `test-key-b-${Date.now()}`;

    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);

    // keyA is exhausted, but keyB should still be allowed
    const resultA = checkRateLimit(keyA, config);
    const resultB = checkRateLimit(keyB, config);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.5' },
    });
    expect(getClientIp(req)).toBe('10.0.0.5');
  });

  it('should return "unknown" when no IP headers present', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});

describe('RATE_LIMITS presets', () => {
  it('should have all expected rate limit configs', () => {
    expect(RATE_LIMITS.LOGIN).toBeDefined();
    expect(RATE_LIMITS.VERIFY_CODE).toBeDefined();
    expect(RATE_LIMITS.FORGOT_PASSWORD).toBeDefined();
    expect(RATE_LIMITS.RESEND_CODE).toBeDefined();
    expect(RATE_LIMITS.REGISTER).toBeDefined();
    expect(RATE_LIMITS.GENERATE_PLAN).toBeDefined();
    expect(RATE_LIMITS.GENERATE_REPORT).toBeDefined();
    expect(RATE_LIMITS.API_WRITE).toBeDefined();
  });

  it('each config should have maxAttempts and windowSeconds', () => {
    for (const config of Object.values(RATE_LIMITS)) {
      expect(config.maxAttempts).toBeGreaterThan(0);
      expect(config.windowSeconds).toBeGreaterThan(0);
    }
  });
});
