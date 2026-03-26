import { describe, it, expect } from 'vitest';
import { getAccessToken, getRefreshToken } from '@/src/shared/lib/auth-cookies';

function createMockRequest(cookies: string): Request {
  return new Request('http://localhost:3000/api/test', {
    headers: { cookie: cookies },
  });
}

describe('auth-cookies', () => {
  describe('getAccessToken', () => {
    it('should extract access token from cookie header', () => {
      const req = createMockRequest('access-token=abc123; refresh-token=xyz789');
      expect(getAccessToken(req)).toBe('abc123');
    });

    it('should return undefined when no cookie header', () => {
      const req = new Request('http://localhost:3000/api/test');
      expect(getAccessToken(req)).toBeUndefined();
    });

    it('should return undefined when access-token cookie is missing', () => {
      const req = createMockRequest('refresh-token=xyz789');
      expect(getAccessToken(req)).toBeUndefined();
    });
  });

  describe('getRefreshToken', () => {
    it('should extract refresh token from cookie header', () => {
      const req = createMockRequest('access-token=abc123; refresh-token=xyz789');
      expect(getRefreshToken(req)).toBe('xyz789');
    });

    it('should return undefined when refresh-token cookie is missing', () => {
      const req = createMockRequest('access-token=abc123');
      expect(getRefreshToken(req)).toBeUndefined();
    });
  });
});
