import { ICacheService } from '@/src/domain/interfaces/services/cache.service';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory cache implementation.
 * For production at scale, replace with Redis via the same ICacheService interface.
 */
export class InMemoryCacheService implements ICacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

/**
 * Redis-backed cache implementation using Upstash REST API.
 * Used in production when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Supports serverless environments (no persistent connection needed).
 */
export class UpstashCacheService implements ICacheService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async command(...args: (string | number)[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.command('GET', key);
      if (raw === null || raw === undefined) return null;
      return JSON.parse(raw as string) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.command('SET', key, serialized, 'EX', ttlSeconds);
      } else {
        await this.command('SET', key, serialized);
      }
    } catch {
      // Fail silently — cache is non-critical
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.command('DEL', key);
    } catch {
      // Fail silently
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      // SCAN-based prefix deletion via Upstash
      let cursor = '0';
      let count = 0;
      do {
        const result = await this.command('SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', 100) as [string, string[]];
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await this.command('DEL', ...keys);
          count += keys.length;
        }
      } while (cursor !== '0');
      return count;
    } catch {
      return 0;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.command('EXISTS', key);
      return result === 1;
    } catch {
      return false;
    }
  }
}

/**
 * Factory: creates the best available cache implementation.
 * Uses Upstash Redis if configured, otherwise falls back to in-memory.
 */
export function createCacheService(): ICacheService {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    return new UpstashCacheService(redisUrl, redisToken);
  }

  return new InMemoryCacheService();
}

export function buildCacheKey(...parts: string[]): string {
  return parts.join(':');
}
